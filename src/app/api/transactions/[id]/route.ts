/**
 * GET /api/transactions/:id
 * PATCH /api/transactions/:id
 * DELETE /api/transactions/:id
 *
 * 단일 거래 내역 조회/수정/삭제 API
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getTransactionById,
  updateTransaction,
  deleteTransaction,
} from '@/lib/supabase/queries';
import { createActionHistory } from '@/lib/repositories/action-history.repo';
import type { UpdateTransactionDto, Transaction } from '@/types';
import { isValidCategory } from '@/lib/utils/validation';
import { formatNumber } from '@/lib/utils/format';
import { saveCategoryMapping } from '@/lib/services/mappings.service';
import { extractPattern } from '@/lib/classifier';
import { supabase } from '@/lib/supabase/client';

/** 변경 내용을 상세하게 설명하는 함수 */
function generateChangeDescription(
  previousData: Transaction,
  updates: UpdateTransactionDto
): string {
  const changes: string[] = [];
  const merchantName = updates.merchant_name || previousData.merchant_name;

  // 삭제
  if (updates.is_deleted === true) {
    return `"${previousData.merchant_name}" 삭제`;
  }

  // 이용처명 변경
  if (updates.merchant_name && updates.merchant_name !== previousData.merchant_name) {
    changes.push(`이용처: ${previousData.merchant_name} → ${updates.merchant_name}`);
  }

  // 카테고리 변경
  if (updates.category && updates.category !== previousData.category) {
    changes.push(`카테고리: ${previousData.category} → ${updates.category}`);
  }

  // 금액 변경
  if (updates.amount !== undefined && updates.amount !== previousData.amount) {
    changes.push(`금액: ${formatNumber(previousData.amount)}원 → ${formatNumber(updates.amount)}원`);
  }

  // 날짜 변경
  if (updates.transaction_date && updates.transaction_date !== previousData.transaction_date) {
    changes.push(`날짜: ${previousData.transaction_date} → ${updates.transaction_date}`);
  }

  // 메모 변경
  if (updates.memo !== undefined && updates.memo !== (previousData.memo || '')) {
    if (updates.memo) {
      changes.push(`메모 추가`);
    } else {
      changes.push(`메모 삭제`);
    }
  }

  if (changes.length === 0) {
    return `"${merchantName}" 수정`;
  }

  if (changes.length === 1) {
    return `"${merchantName}" ${changes[0]}`;
  }

  return `"${merchantName}" ${changes.length}개 항목 수정`;
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/transactions/:id
 * 단일 거래 내역 조회
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID가 필요합니다.' },
        { status: 400 }
      );
    }

    const result = await getTransactionById(id);

    if (result.error) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: `서버 오류: ${String(err)}` },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/transactions/:id
 * 거래 내역 수정
 *
 * Body:
 * - transaction_date?: string
 * - merchant_name?: string
 * - amount?: number
 * - category?: Category
 * - memo?: string
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID가 필요합니다.' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // 빈 업데이트 체크
    const allowedFields = [
      'transaction_date',
      'merchant_name',
      'amount',
      'category',
      'memo',
      'is_deleted',
    ];
    const updates: UpdateTransactionDto = {};
    let hasUpdates = false;

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === 'category' && !isValidCategory(body[field])) {
          return NextResponse.json(
            { success: false, error: '유효하지 않은 카테고리입니다.' },
            { status: 400 }
          );
        }

        if (field === 'amount') {
          updates[field] = Number(body[field]);
        } else {
          (updates as Record<string, unknown>)[field] = body[field];
        }
        hasUpdates = true;
      }
    }

    if (!hasUpdates) {
      return NextResponse.json(
        { success: false, error: '수정할 내용이 없습니다.' },
        { status: 400 }
      );
    }

    // 수정 전 데이터 조회 (히스토리용)
    const beforeResult = await getTransactionById(id);
    const previousData = beforeResult.data;

    const result = await updateTransaction(id, updates);

    if (result.error) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    if (previousData) {
      const merchantChanged = updates.merchant_name && updates.merchant_name !== previousData.merchant_name;
      const categoryChanged = updates.category && updates.category !== previousData.category;

      if (merchantChanged) {
        try {
          const pattern = extractPattern(previousData.merchant_name);
          await supabase
            .from('merchant_name_mappings')
            .upsert(
              {
                original_pattern: pattern,
                preferred_name: updates.merchant_name,
                example_original: previousData.merchant_name,
                match_count: 1,
              },
              { onConflict: 'original_pattern' }
            );
        } catch (mappingError) {
          console.error('???? ?? ?? ??:', mappingError);
        }
      }

      if (categoryChanged) {
        const targetMerchant = (updates.merchant_name as string | undefined) || previousData.merchant_name;
        try {
          await saveCategoryMapping(targetMerchant, updates.category as any);
        } catch (mappingError) {
          console.error('???? ?? ?? ??:', mappingError);
        }
      }
    }

    // 히스토리 기록 (상세 변경 내용 포함)
    if (previousData) {
      const isDelete = updates.is_deleted === true;
      const description = generateChangeDescription(previousData, updates);

      await createActionHistory({
        action_type: isDelete ? 'delete' : 'update',
        entity_type: 'transaction',
        entity_id: id,
        description,
        previous_data: previousData as unknown as Record<string, unknown>,
        new_data: result.data as unknown as Record<string, unknown>,
        owner: previousData.owner,
      });
    }

    return NextResponse.json({
      success: true,
      message: '거래 내역이 수정되었습니다.',
      data: result.data,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: `서버 오류: ${String(err)}` },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/transactions/:id
 * 거래 내역 삭제 (Soft Delete)
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID가 필요합니다.' },
        { status: 400 }
      );
    }

    // 삭제 전 데이터 조회 (히스토리용)
    const beforeResult = await getTransactionById(id);
    const previousData = beforeResult.data;

    const result = await deleteTransaction(id);

    if (result.error) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    if (previousData) {
      const merchantChanged = updates.merchant_name && updates.merchant_name !== previousData.merchant_name;
      const categoryChanged = updates.category && updates.category !== previousData.category;

      if (merchantChanged) {
        try {
          const pattern = extractPattern(previousData.merchant_name);
          await supabase
            .from('merchant_name_mappings')
            .upsert(
              {
                original_pattern: pattern,
                preferred_name: updates.merchant_name,
                example_original: previousData.merchant_name,
                match_count: 1,
              },
              { onConflict: 'original_pattern' }
            );
        } catch (mappingError) {
          console.error('???? ?? ?? ??:', mappingError);
        }
      }

      if (categoryChanged) {
        const targetMerchant = (updates.merchant_name as string | undefined) || previousData.merchant_name;
        try {
          await saveCategoryMapping(targetMerchant, updates.category as any);
        } catch (mappingError) {
          console.error('???? ?? ?? ??:', mappingError);
        }
      }
    }

    // 히스토리 기록
    if (previousData) {
      const formattedAmount = formatNumber(previousData.amount);
      await createActionHistory({
        action_type: 'delete',
        entity_type: 'transaction',
        entity_id: id,
        description: `"${previousData.merchant_name}" 삭제 (${previousData.transaction_date}, ${formattedAmount}원)`,
        previous_data: previousData as unknown as Record<string, unknown>,
        owner: previousData.owner,
      });
    }

    return NextResponse.json({
      success: true,
      message: '거래 내역이 삭제되었습니다.',
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: `서버 오류: ${String(err)}` },
      { status: 500 }
    );
  }
}
