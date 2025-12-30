/**
 * /api/mappings
 * 카테고리 및 이용처명 매핑 관리 API
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { saveManualMapping } from '@/lib/classifier';
import { isValidCategory } from '@/lib/utils/validation';
import type { Category } from '@/types';

/** 카테고리 매핑 타입 */
interface CategoryMapping {
  id: string;
  pattern: string;
  category: Category;
  source: 'ai' | 'manual';
  match_count: number;
  created_at: string;
}

/** 이용처명 매핑 타입 */
interface MerchantNameMapping {
  id: string;
  original_pattern: string;
  preferred_name: string;
  match_count: number;
  created_at: string;
}

/**
 * GET /api/mappings
 * 모든 매핑 조회
 */
export async function GET(): Promise<NextResponse> {
  try {
    // 카테고리 매핑 조회 (최신순 정렬)
    const { data: categoryMappings, error: catError } = await supabase
      .from('category_mappings')
      .select('*')
      .order('created_at', { ascending: false });

    if (catError) {
      return NextResponse.json(
        { success: false, error: catError.message },
        { status: 500 }
      );
    }

    // 이용처명 매핑 조회 (최신순 정렬)
    const { data: merchantMappings, error: merchantError } = await supabase
      .from('merchant_name_mappings')
      .select('*')
      .order('created_at', { ascending: false });

    if (merchantError) {
      return NextResponse.json(
        { success: false, error: merchantError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        categoryMappings: (categoryMappings || []) as CategoryMapping[],
        merchantMappings: (merchantMappings || []) as MerchantNameMapping[],
      },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: `서버 오류: ${String(err)}` },
      { status: 500 }
    );
  }
}

interface SaveMappingRequest {
  merchantName: string;
  category: Category;
}

/**
 * POST /api/mappings
 * 수동 카테고리 매핑 저장
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: SaveMappingRequest = await request.json();
    const { merchantName, category } = body;

    if (!merchantName || !category) {
      return NextResponse.json(
        { success: false, error: 'merchantName과 category가 필요합니다.' },
        { status: 400 }
      );
    }

    if (!isValidCategory(category)) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 카테고리입니다.' },
        { status: 400 }
      );
    }

    await saveManualMapping(merchantName, category);

    return NextResponse.json({
      success: true,
      message: '매핑이 저장되었습니다.',
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: `서버 오류: ${String(err)}` },
      { status: 500 }
    );
  }
}

interface UpdateMappingRequest {
  type: 'category' | 'merchant';
  id: string;
  // 카테고리 매핑 업데이트
  category?: Category;
  // 이용처명 매핑 업데이트
  preferredName?: string;
}

/**
 * PATCH /api/mappings
 * 매핑 수정
 */
export async function PATCH(request: NextRequest): Promise<NextResponse> {
  try {
    const body: UpdateMappingRequest = await request.json();
    const { type, id, category, preferredName } = body;

    if (!type || !id) {
      return NextResponse.json(
        { success: false, error: 'type과 id가 필요합니다.' },
        { status: 400 }
      );
    }

    if (type === 'category') {
      if (!category || !isValidCategory(category)) {
        return NextResponse.json(
          { success: false, error: '유효한 category가 필요합니다.' },
          { status: 400 }
        );
      }

      // 이전 데이터 조회
      const { data: prevData } = await supabase
        .from('category_mappings')
        .select('*')
        .eq('id', id)
        .single();

      const { error } = await supabase
        .from('category_mappings')
        .update({ category, source: 'manual' })
        .eq('id', id);

      if (error) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500 }
        );
      }

      // action_history에 기록
      if (prevData && prevData.category !== category) {
        await supabase.from('action_history').insert({
          action_type: 'update',
          entity_type: 'mapping',
          entity_id: id,
          description: `카테고리 매핑 변경: ${prevData.pattern} (${prevData.category} → ${category})`,
          previous_data: { category: prevData.category, source: prevData.source },
          new_data: { category, source: 'manual' },
        });
      }
    } else if (type === 'merchant') {
      if (!preferredName) {
        return NextResponse.json(
          { success: false, error: 'preferredName이 필요합니다.' },
          { status: 400 }
        );
      }

      // 이전 데이터 조회
      const { data: prevData } = await supabase
        .from('merchant_name_mappings')
        .select('*')
        .eq('id', id)
        .single();

      const { error } = await supabase
        .from('merchant_name_mappings')
        .update({ preferred_name: preferredName })
        .eq('id', id);

      if (error) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500 }
        );
      }

      // action_history에 기록
      if (prevData && prevData.preferred_name !== preferredName) {
        await supabase.from('action_history').insert({
          action_type: 'update',
          entity_type: 'mapping',
          entity_id: id,
          description: `이용처명 매핑 변경: ${prevData.original_pattern} (${prevData.preferred_name} → ${preferredName})`,
          previous_data: { preferred_name: prevData.preferred_name },
          new_data: { preferred_name: preferredName },
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: '매핑이 수정되었습니다.',
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: `서버 오류: ${String(err)}` },
      { status: 500 }
    );
  }
}

interface DeleteMappingRequest {
  type: 'category' | 'merchant';
  id: string;
}

/**
 * DELETE /api/mappings
 * 매핑 삭제
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as 'category' | 'merchant' | null;
    const id = searchParams.get('id');

    if (!type || !id) {
      return NextResponse.json(
        { success: false, error: 'type과 id가 필요합니다.' },
        { status: 400 }
      );
    }

    const tableName = type === 'category' ? 'category_mappings' : 'merchant_name_mappings';

    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '매핑이 삭제되었습니다.',
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: `서버 오류: ${String(err)}` },
      { status: 500 }
    );
  }
}
