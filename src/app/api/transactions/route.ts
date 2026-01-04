/**
 * GET /api/transactions
 * POST /api/transactions (수동 추가)
 *
 * 거래 내역 조회 및 추가 API
 */

import { NextRequest, NextResponse } from 'next/server';
import { createActionHistory } from '@/lib/repositories/action-history.repo';
import { supabase } from '@/lib/supabase/client';
import type {
  TransactionQueryParams,
  CreateTransactionDto,
  Category,
  Owner,
  TransactionType,
} from '@/types';
import { fetchTransactionsWithSummary } from '@/lib/services/transactions.service';
import { isValidMonth, isValidCategory } from '@/lib/utils/validation';
import { formatNumber } from '@/lib/utils/format';

/**
 * GET /api/transactions
 * 월별 거래 내역 조회
 *
 * Query Params:
 * - month: YYYY-MM (필수)
 * - sort: date_asc | date_desc | amount_asc | amount_desc
 * - category: 카테고리 필터
 * - owner: husband | wife
 * - include_summary: true면 집계 데이터도 포함
 * - limit: 반환할 최대 건수 (기본: 전체)
 * - offset: 건너뛸 건수 (기본: 0)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);

    const month = searchParams.get('month');
    const sort = searchParams.get('sort') as TransactionQueryParams['sort'];
    const category = searchParams.get('category') as Category | null;
    const owner = searchParams.get('owner') as Owner | null;
    const includeSummary = searchParams.get('include_summary') === 'true';
    const transactionType = searchParams.get('transaction_type') as TransactionType | 'all' | null;
    const limitStr = searchParams.get('limit');
    const offsetStr = searchParams.get('offset');

    // 월 필수 검증
    if (!month) {
      return NextResponse.json(
        { success: false, error: 'month 파라미터가 필요합니다. (예: 2025-12)' },
        { status: 400 }
      );
    }

    if (!isValidMonth(month)) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 월 형식입니다. (YYYY-MM)' },
        { status: 400 }
      );
    }

    // 카테고리 검증
    if (category && !isValidCategory(category)) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 카테고리입니다.' },
        { status: 400 }
      );
    }

    // owner 검증
    if (owner && owner !== 'husband' && owner !== 'wife') {
      return NextResponse.json(
        { success: false, error: 'owner는 husband 또는 wife여야 합니다.' },
        { status: 400 }
      );
    }

    // 페이지네이션 파라미터 파싱
    const limit = limitStr ? parseInt(limitStr, 10) : undefined;
    const offset = offsetStr ? parseInt(offsetStr, 10) : 0;

    // 거래 내역 조회
    const params: TransactionQueryParams = {
      month,
      sort: sort || 'date_desc',
      category: category || undefined,
      owner: owner || undefined,
      transactionType: transactionType || undefined,
      limit,
      offset,
    };

    const result = await fetchTransactionsWithSummary(params, includeSummary);

    if (result.error) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      count: result.data?.length || 0,
      month,
      summary: result.summary,
      pagination: result.pagination,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: `서버 오류: ${String(err)}` },
      { status: 500 }
    );
  }
}

/**
 * POST /api/transactions
 * 거래 내역 수동 추가
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();

    // 필수 필드 검증
    const requiredFields = [
      'transaction_date',
      'merchant_name',
      'amount',
      'category',
      'source_type',
      'owner',
    ];

    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { success: false, error: `${field}은(는) 필수입니다.` },
          { status: 400 }
        );
      }
    }

    // 카테고리 검증
    if (!isValidCategory(body.category)) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 카테고리입니다.' },
        { status: 400 }
      );
    }

    // owner 검증
    if (body.owner !== 'husband' && body.owner !== 'wife') {
      return NextResponse.json(
        { success: false, error: 'owner는 husband 또는 wife여야 합니다.' },
        { status: 400 }
      );
    }

    const transaction: CreateTransactionDto = {
      transaction_date: body.transaction_date,
      merchant_name: body.merchant_name,
      amount: Number(body.amount),
      category: body.category,
      source_type: body.source_type,
      owner: body.owner,
      memo: body.memo,
    };

    // 단일 거래 생성 (ID 반환을 위해 직접 insert)
    const { data: insertedData, error: insertError } = await supabase
      .from('transactions')
      .insert({ ...transaction, is_deleted: false })
      .select()
      .single();

    if (insertError) {
      // 중복 에러 처리
      if (insertError.code === '23505') {
        return NextResponse.json({
          success: true,
          message: '중복된 거래 내역입니다.',
          inserted: 0,
        });
      }
      return NextResponse.json(
        { success: false, error: insertError.message },
        { status: 500 }
      );
    }

    // 히스토리 기록 (상세 정보 포함)
    const formattedAmount = formatNumber(transaction.amount);
    await createActionHistory({
      action_type: 'create',
      entity_type: 'transaction',
      entity_id: insertedData.id,
      description: `"${transaction.merchant_name}" 추가 (${transaction.transaction_date}, ${formattedAmount}원, ${transaction.category})`,
      new_data: insertedData as Record<string, unknown>,
      owner: transaction.owner,
    });

    return NextResponse.json({
      success: true,
      message: '거래 내역이 추가되었습니다.',
      inserted: 1,
      data: insertedData,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: `서버 오류: ${String(err)}` },
      { status: 500 }
    );
  }
}
