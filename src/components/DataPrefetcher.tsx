/**
 * 앱 초기 로드 시 데이터 프리페칭
 * - 현재 월 + 이전 2개월 소득/지출 데이터
 * - 가계분석 탭용 추세 데이터
 * - 거래 내역 데이터
 */

'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAppContext } from '@/contexts/AppContext';
import { getAdjacentMonth, getRecentMonths } from '@/lib/utils/date';
import { PREFETCH_DELAY } from '@/constants/timing';

/** 월별 집계 데이터 fetch 함수 */
async function fetchMonthlyAggregation(
  month: string,
  owner?: string,
  transactionType: 'expense' | 'income' = 'expense'
) {
  const params = new URLSearchParams();
  params.set('month', month);
  params.set('include_summary', 'true');
  params.set('transaction_type', transactionType);
  if (owner) params.set('owner', owner);

  const res = await fetch(`/api/transactions?${params.toString()}`);
  if (!res.ok) {
    throw new Error('데이터를 불러오는데 실패했습니다.');
  }
  return res.json();
}

/** 여러 월의 집계 데이터 fetch 함수 */
async function fetchMultiMonthAggregation(
  months: string[],
  owner?: string,
  transactionType: 'expense' | 'income' = 'expense'
) {
  const results = await Promise.all(
    months.map(async (month) => {
      const data = await fetchMonthlyAggregation(month, owner, transactionType);
      return {
        month,
        total: data.summary?.total || 0,
        totalCount: data.summary?.totalCount || 0,
        byCategory: data.summary?.byCategory || [],
      };
    })
  );
  return results;
}

export function DataPrefetcher() {
  const queryClient = useQueryClient();
  const { selectedMonth, selectedOwner } = useAppContext();
  const lastPrefetchedMonth = useRef<string | null>(null);
  const initialPrefetchDone = useRef(false);

  useEffect(() => {
    const owner = selectedOwner || undefined;

    // 이미 같은 월을 프리페칭했으면 스킵 (월 변경시에만 다시 실행)
    if (lastPrefetchedMonth.current === selectedMonth && initialPrefetchDone.current) {
      return;
    }

    lastPrefetchedMonth.current = selectedMonth;

    const prefetchMonthly = (month: string, transactionType: 'expense' | 'income') => {
      queryClient.prefetchQuery({
        queryKey: ['dashboard', 'monthly', month, owner, transactionType],
        queryFn: () => fetchMonthlyAggregation(month, owner, transactionType),
        staleTime: 1000 * 60 * 5,
      });
    };

    const prefetchTrend = (
      monthCount: number,
      transactionType: 'expense' | 'income',
      endMonth: string
    ) => {
      const months = getRecentMonths(monthCount, endMonth);
      queryClient.prefetchQuery({
        queryKey: ['dashboard', 'trend', monthCount, owner, transactionType, endMonth],
        queryFn: () => fetchMultiMonthAggregation(months, owner, transactionType),
        staleTime: 1000 * 60 * 5,
      });
    };

    const prefetchTransactions = (
      month: string,
      transactionType: 'expense' | 'income' | 'all',
      includeSummary: boolean = false
    ) => {
      const params = new URLSearchParams();
      params.set('month', month);
      params.set('transaction_type', transactionType);
      if (owner) params.set('owner', owner);
      if (includeSummary) params.set('include_summary', 'true');

      // 캐시 키를 useTransactions 훅과 동일하게 구성
      const queryParams = {
        month,
        transactionType,
        owner,
        ...(includeSummary && { includeSummary: true }),
      };

      queryClient.prefetchQuery({
        queryKey: ['transactions', queryParams],
        queryFn: async () => {
          const res = await fetch(`/api/transactions?${params.toString()}`);
          if (!res.ok) throw new Error('Failed to fetch');
          return res.json();
        },
        staleTime: 1000 * 60 * 5,
      });
    };

    const extendedEndMonth = getAdjacentMonth(selectedMonth, 1);
    const prev1Month = getAdjacentMonth(selectedMonth, -1);
    const prev2Month = getAdjacentMonth(selectedMonth, -2);
    const nextMonth = getAdjacentMonth(selectedMonth, 1);

    // 1단계: 가계분석 탭 데이터 즉시 프리페칭 (최우선)
    // - 현재 월 도넛차트용 (소득+지출 통합)
    prefetchTransactions(selectedMonth, 'all', true);
    // - 막대차트용 추세 데이터 (14개월 = 12 + 확장 2개월)
    prefetchTrend(14, 'expense', extendedEndMonth);
    prefetchTrend(14, 'income', extendedEndMonth);

    // 2단계: 현재 월 소득/지출 + 이전 1개월 가계분석 데이터
    setTimeout(() => {
      // 현재 월 소득/지출
      prefetchMonthly(selectedMonth, 'expense');
      prefetchMonthly(selectedMonth, 'income');
      prefetchTransactions(selectedMonth, 'expense');
      prefetchTransactions(selectedMonth, 'income');
      // 이전 1개월 가계분석 도넛차트용
      prefetchTransactions(prev1Month, 'all', true);
      // 이전 1개월 가계분석 막대차트용 (월별 집계)
      prefetchMonthly(prev1Month, 'expense');
      prefetchMonthly(prev1Month, 'income');
    }, PREFETCH_DELAY.FAST);

    // 3단계: 기간 변경 대비 추세 데이터 (8개월, 16개월)
    setTimeout(() => {
      prefetchTrend(8, 'expense', extendedEndMonth);
      prefetchTrend(8, 'income', extendedEndMonth);
      prefetchTrend(16, 'expense', extendedEndMonth);
      prefetchTrend(16, 'income', extendedEndMonth);
    }, PREFETCH_DELAY.NORMAL);

    // 4단계: 2개월 전 데이터 + 다음 월 데이터
    setTimeout(() => {
      // 2개월 전 가계분석 도넛차트용
      prefetchTransactions(prev2Month, 'all', true);
      // 2개월 전 소득/지출
      prefetchMonthly(prev2Month, 'expense');
      prefetchMonthly(prev2Month, 'income');
      // 다음 월 데이터
      prefetchTransactions(nextMonth, 'all', true);
      prefetchMonthly(nextMonth, 'expense');
      prefetchMonthly(nextMonth, 'income');
    }, PREFETCH_DELAY.SLOW);

    initialPrefetchDone.current = true;
  }, [selectedMonth, selectedOwner, queryClient]);

  // UI를 렌더링하지 않음
  return null;
}
