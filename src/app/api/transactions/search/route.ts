/**
 * 거래 내역 검색 API
 * 고급 필터링 지원 (기간, 이용처, 카테고리, 금액범위, 결제수단)
 */

import { NextRequest, NextResponse } from 'next/server';
import { searchTransactions } from '@/lib/supabase/queries';
import type { TransactionSearchParams, Owner, TransactionType } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // 쿼리 파라미터 파싱
    const params: TransactionSearchParams = {
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      merchantSearch: searchParams.get('merchantSearch') || undefined,
      categories: searchParams.get('categories') || undefined,
      sourceTypes: searchParams.get('sourceTypes') || undefined,
      amountMin: searchParams.get('amountMin')
        ? parseInt(searchParams.get('amountMin')!, 10)
        : undefined,
      amountMax: searchParams.get('amountMax')
        ? parseInt(searchParams.get('amountMax')!, 10)
        : undefined,
      owner: (searchParams.get('owner') as Owner) || undefined,
      transactionType:
        (searchParams.get('transactionType') as TransactionType | 'all') || 'all',
      sort:
        (searchParams.get('sort') as TransactionSearchParams['sort']) || 'date_desc',
      limit: searchParams.get('limit')
        ? parseInt(searchParams.get('limit')!, 10)
        : 100,
      offset: searchParams.get('offset')
        ? parseInt(searchParams.get('offset')!, 10)
        : 0,
    };

    const result = await searchTransactions(params);

    if (result.error) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      ...result.data,
    });
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { success: false, error: '검색 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
