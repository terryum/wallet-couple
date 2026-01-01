/**
 * PATCH /api/transactions/bulk
 * 여러 거래의 카테고리 또는 이용처명 일괄 수정
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { extractPattern } from '@/lib/classifier';
import { saveCategoryMapping } from '@/lib/services/mappings.service';
import type { Category } from '@/types';

interface BulkUpdateRequest {
  ids: string[];
  category?: Category;
  merchant_name?: string;
  // 이용처명 매핑 저장 관련
  save_mapping?: boolean;
  save_category_mapping?: boolean;
  original_merchant?: string;
}

interface BulkUpdateResponse {
  success: boolean;
  updated: number;
  error?: string;
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  try {
    const body: BulkUpdateRequest = await request.json();
    const {
      ids,
      category,
      merchant_name,
      save_mapping,
      save_category_mapping,
      original_merchant,
    } = body;

    if (!ids || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'ids 배열이 필요합니다.', updated: 0 },
        { status: 400 }
      );
    }

    if (!category && !merchant_name) {
      return NextResponse.json(
        { success: false, error: 'category 또는 merchant_name이 필요합니다.', updated: 0 },
        { status: 400 }
      );
    }

    // 업데이트할 필드 구성
    const updateData: Record<string, string> = {};
    if (category) {
      updateData.category = category;
    }
    if (merchant_name) {
      updateData.merchant_name = merchant_name;
    }

    // 일괄 업데이트
    const { data, error } = await supabase
      .from('transactions')
      .update(updateData)
      .in('id', ids)
      .select('id');

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message, updated: 0 },
        { status: 500 }
      );
    }

    // 이용처명 매핑 저장
    if (save_mapping && merchant_name && original_merchant) {
      try {
        const pattern = extractPattern(original_merchant);

        await supabase
          .from('merchant_name_mappings')
          .upsert(
            {
              original_pattern: pattern,
              preferred_name: merchant_name,
              example_original: original_merchant,
              match_count: 1,
            },
            {
              onConflict: 'original_pattern',
            }
          );

        console.log(`[이용처 매핑 저장] ${original_merchant} → ${pattern} → ${merchant_name}`);
      } catch (mappingError) {
        console.error('이용처명 매핑 저장 실패:', mappingError);
        // 매핑 저장 실패해도 거래 수정은 성공으로 처리
      }
    }

    const response: BulkUpdateResponse = {
      success: true,
      updated: data?.length || 0,
    };

    return NextResponse.json(response);
  } catch (err) {
    return NextResponse.json(
      { success: false, error: String(err), updated: 0 },
      { status: 500 }
    );
  }
}
