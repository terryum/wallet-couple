/**
 * PATCH /api/transactions/bulk
 * 여러 거래의 카테고리 또는 이용처명 일괄 수정
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { extractPattern } from '@/lib/classifier';
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
  mappingId?: string;
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

    // 1. 업데이트 전 이전 값 조회 (히스토리용)
    const { data: previousData } = await supabase
      .from('transactions')
      .select('id, category, merchant_name')
      .in('id', ids);

    // 업데이트할 필드 구성
    const updateData: Record<string, string> = {};
    if (category) {
      updateData.category = category;
    }
    if (merchant_name) {
      updateData.merchant_name = merchant_name;
    }

    // 2. 일괄 업데이트
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

    let mappingId: string | undefined;

    // 3. 이용처명 매핑 저장
    if (save_mapping && merchant_name && original_merchant) {
      try {
        const pattern = extractPattern(original_merchant);

        const { data: mappingData } = await supabase
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
          )
          .select('id')
          .single();

        mappingId = mappingData?.id;
        console.log(`[이용처 매핑 저장] ${original_merchant} → ${pattern} → ${merchant_name}`);
      } catch (mappingError) {
        console.error('이용처명 매핑 저장 실패:', mappingError);
      }
    }

    // 4. 카테고리 매핑 저장 (save_category_mapping 플래그가 있을 때)
    if (save_category_mapping && category && original_merchant) {
      try {
        const { saveManualMapping } = await import('@/lib/classifier');
        const result = await saveManualMapping(original_merchant, category);
        if (result.id) {
          mappingId = result.id;
          console.log(`[카테고리 매핑 저장] ${original_merchant} → ${category}, ID: ${result.id}`);
        } else if (result.error) {
          console.error('[카테고리 매핑 저장 실패]', result.error);
        }
      } catch (mappingError) {
        console.error('카테고리 매핑 저장 예외:', mappingError);
      }
    }

    // 5. 히스토리에 영향받은 트랜잭션 기록 (매핑 ID와 연결)
    if (mappingId && previousData && previousData.length > 0) {
      try {
        const historyRecords = previousData.map((prev) => ({
          action_type: 'mapping_apply',
          entity_type: 'transaction',
          entity_id: prev.id,
          description: merchant_name
            ? `이용처명 변경: ${prev.merchant_name} → ${merchant_name}`
            : `카테고리 변경: ${prev.category} → ${category}`,
          previous_data: {
            category: prev.category,
            merchant_name: prev.merchant_name,
          },
          new_data: {
            category: category || prev.category,
            merchant_name: merchant_name || prev.merchant_name,
          },
          mapping_id: mappingId,
        }));

        const { error: historyError } = await supabase.from('action_history').insert(historyRecords);
        if (historyError) {
          console.error('[히스토리 저장 실패]', historyError.message, historyError.details);
        } else {
          console.log(`[히스토리 저장] ${historyRecords.length}건의 변경 기록 저장`);
        }
      } catch (historyError) {
        console.error('히스토리 저장 예외:', historyError);
      }
    }

    const response: BulkUpdateResponse = {
      success: true,
      updated: data?.length || 0,
      mappingId,
    };

    return NextResponse.json(response);
  } catch (err) {
    return NextResponse.json(
      { success: false, error: String(err), updated: 0 },
      { status: 500 }
    );
  }
}
