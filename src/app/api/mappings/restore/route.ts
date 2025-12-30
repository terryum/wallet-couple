/**
 * /api/mappings/restore
 * 매핑 복구 API
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

interface RestoreRequest {
  historyId: string;
}

/**
 * POST /api/mappings/restore
 * 히스토리에서 이전 상태로 복구
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: RestoreRequest = await request.json();
    const { historyId } = body;

    if (!historyId) {
      return NextResponse.json(
        { success: false, error: 'historyId가 필요합니다.' },
        { status: 400 }
      );
    }

    // 히스토리 조회
    const { data: history, error: historyError } = await supabase
      .from('action_history')
      .select('*')
      .eq('id', historyId)
      .single();

    if (historyError || !history) {
      return NextResponse.json(
        { success: false, error: '히스토리를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // previous_data가 없으면 복구 불가
    if (!history.previous_data) {
      return NextResponse.json(
        { success: false, error: '복구할 이전 데이터가 없습니다.' },
        { status: 400 }
      );
    }

    const entityId = history.entity_id;
    const previousData = history.previous_data as Record<string, unknown>;

    // 매핑 타입에 따라 복구
    if (previousData.category !== undefined) {
      // 카테고리 매핑 복구
      const { error: updateError } = await supabase
        .from('category_mappings')
        .update({
          category: previousData.category,
          source: previousData.source || 'manual',
        })
        .eq('id', entityId);

      if (updateError) {
        return NextResponse.json(
          { success: false, error: updateError.message },
          { status: 500 }
        );
      }

      // 복구 히스토리 기록
      await supabase.from('action_history').insert({
        action_type: 'update',
        entity_type: 'mapping',
        entity_id: entityId,
        description: `카테고리 매핑 복구: ${previousData.category}`,
        previous_data: history.new_data,
        new_data: previousData,
      });
    } else if (previousData.preferred_name !== undefined) {
      // 이용처명 매핑 복구
      const { error: updateError } = await supabase
        .from('merchant_name_mappings')
        .update({ preferred_name: previousData.preferred_name })
        .eq('id', entityId);

      if (updateError) {
        return NextResponse.json(
          { success: false, error: updateError.message },
          { status: 500 }
        );
      }

      // 복구 히스토리 기록
      await supabase.from('action_history').insert({
        action_type: 'update',
        entity_type: 'mapping',
        entity_id: entityId,
        description: `이용처명 매핑 복구: ${previousData.preferred_name}`,
        previous_data: history.new_data,
        new_data: previousData,
      });
    } else {
      return NextResponse.json(
        { success: false, error: '알 수 없는 매핑 타입입니다.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '매핑이 복구되었습니다.',
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: `서버 오류: ${String(err)}` },
      { status: 500 }
    );
  }
}
