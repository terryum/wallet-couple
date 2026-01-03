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

/** 이전/다음 월 계산 */
function getAdjacentMonth(yearMonth: string, delta: number): string {
  const [year, month] = yearMonth.split('-').map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/** 최근 N개월 목록 생성 */
function getRecentMonths(count: number, endMonth: string): string[] {
  const months: string[] = [];
  const [endYear, endMonthNum] = endMonth.split('-').map(Number);

  for (let i = 0; i < count; i++) {
    const date = new Date(endYear, endMonthNum - 1 - i, 1);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    months.push(`${year}-${month}`);
  }

  return months.reverse();
}

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

    const prefetchTransactions = (month: string, transactionType: 'expense' | 'income') => {
      const params = new URLSearchParams();
      params.set('month', month);
      params.set('transaction_type', transactionType);
      if (owner) params.set('owner', owner);

      queryClient.prefetchQuery({
        queryKey: ['transactions', { month, transactionType, owner }],
        queryFn: async () => {
          const res = await fetch(`/api/transactions?${params.toString()}`);
          if (!res.ok) throw new Error('Failed to fetch');
          return res.json();
        },
        staleTime: 1000 * 60 * 5,
      });
    };

    // 1단계: 현재 월 지출 데이터 즉시 프리페칭 (가장 높은 우선순위)
    prefetchMonthly(selectedMonth, 'expense');
    prefetchTransactions(selectedMonth, 'expense');

    // 2단계: 현재 월 소득 데이터 (약간의 지연 후)
    setTimeout(() => {
      prefetchMonthly(selectedMonth, 'income');
      prefetchTransactions(selectedMonth, 'income');
    }, 100);

    // 3단계: 이전 2개월 데이터 (백그라운드)
    setTimeout(() => {
      const prevMonths = [
        getAdjacentMonth(selectedMonth, -1),
        getAdjacentMonth(selectedMonth, -2),
      ];

      prevMonths.forEach((month) => {
        prefetchMonthly(month, 'expense');
        prefetchMonthly(month, 'income');
      });
    }, 300);

    // 4단계: 가계분석 탭용 추세 데이터 (손익선 확장 포함: 8개월)
    setTimeout(() => {
      const extendedEndMonth = getAdjacentMonth(selectedMonth, 1);
      prefetchTrend(8, 'expense', extendedEndMonth);
      prefetchTrend(8, 'income', extendedEndMonth);

      // 12개월 추세도 프리페칭
      prefetchTrend(14, 'expense', extendedEndMonth);
      prefetchTrend(14, 'income', extendedEndMonth);
    }, 500);

    // 5단계: 다음 월 데이터도 프리페칭 (월 이동 대비)
    setTimeout(() => {
      const nextMonth = getAdjacentMonth(selectedMonth, 1);
      prefetchMonthly(nextMonth, 'expense');
      prefetchMonthly(nextMonth, 'income');
    }, 800);

    initialPrefetchDone.current = true;
  }, [selectedMonth, selectedOwner, queryClient]);

  // UI를 렌더링하지 않음
  return null;
}
