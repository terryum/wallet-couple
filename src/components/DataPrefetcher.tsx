/**
 * 앱 초기 로드 시 데이터 프리페칭
 * - PrefetchManager를 사용하여 유휴 시간에 프리페칭
 * - 사용자 액션 시 프리페칭 일시 중단
 * - 현재 탭 기준 우선순위 프리페칭
 */

'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAppContext } from '@/contexts/AppContext';
import { getPrefetchManager } from '@/lib/prefetch';
import { getAdjacentMonth, getRecentMonths, getCurrentYearMonth } from '@/lib/utils/date';

/** 월별 집계 데이터 fetch 함수 */
async function fetchMonthlyAggregation(
  month: string,
  owner?: string,
  transactionType: 'expense' | 'income' = 'expense',
  signal?: AbortSignal
) {
  const params = new URLSearchParams();
  params.set('month', month);
  params.set('include_summary', 'true');
  params.set('transaction_type', transactionType);
  if (owner) params.set('owner', owner);

  const res = await fetch(`/api/transactions?${params.toString()}`, { signal });
  if (!res.ok) {
    throw new Error('데이터를 불러오는데 실패했습니다.');
  }
  return res.json();
}

/** 여러 월의 집계 데이터 fetch 함수 */
async function fetchMultiMonthAggregation(
  months: string[],
  owner?: string,
  transactionType: 'expense' | 'income' = 'expense',
  signal?: AbortSignal
) {
  const results = await Promise.all(
    months.map(async (month) => {
      const data = await fetchMonthlyAggregation(month, owner, transactionType, signal);
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
  const { selectedMonth, selectedOwner, activeTab } = useAppContext();
  const lastContextRef = useRef({ month: '', owner: '', tab: '' });
  const manager = getPrefetchManager();

  // 프리페칭 함수들
  const prefetchMonthly = useCallback(
    (month: string, transactionType: 'expense' | 'income') => {
      const owner = selectedOwner || undefined;
      queryClient.prefetchQuery({
        queryKey: ['dashboard', 'monthly', month, owner, transactionType],
        queryFn: ({ signal }) => fetchMonthlyAggregation(month, owner, transactionType, signal),
        staleTime: 1000 * 60 * 5,
      });
    },
    [queryClient, selectedOwner]
  );

  const prefetchTrend = useCallback(
    (monthCount: number, transactionType: 'expense' | 'income') => {
      const owner = selectedOwner || undefined;
      const fixedEndMonth = getCurrentYearMonth();
      const months = getRecentMonths(monthCount, fixedEndMonth);
      queryClient.prefetchQuery({
        queryKey: ['dashboard', 'trend', monthCount, owner, transactionType],
        queryFn: ({ signal }) => fetchMultiMonthAggregation(months, owner, transactionType, signal),
        staleTime: 1000 * 60 * 5,
      });
    },
    [queryClient, selectedOwner]
  );

  const prefetchTransactions = useCallback(
    (month: string, transactionType: 'expense' | 'income' | 'all', includeSummary = false) => {
      const owner = selectedOwner || undefined;
      const params = new URLSearchParams();
      params.set('month', month);
      params.set('transaction_type', transactionType);
      if (owner) params.set('owner', owner);
      if (includeSummary) params.set('include_summary', 'true');

      const queryParams = {
        month,
        transactionType,
        owner,
        ...(includeSummary && { includeSummary: true }),
      };

      queryClient.prefetchQuery({
        queryKey: ['transactions', queryParams],
        queryFn: async ({ signal }) => {
          const res = await fetch(`/api/transactions?${params.toString()}`, { signal });
          if (!res.ok) throw new Error('Failed to fetch');
          return res.json();
        },
        staleTime: 1000 * 60 * 5,
      });
    },
    [queryClient, selectedOwner]
  );

  useEffect(() => {
    const owner = selectedOwner || undefined;
    const context = {
      month: selectedMonth,
      owner: selectedOwner || '',
      tab: activeTab,
    };

    // 컨텍스트 변경 없으면 스킵
    if (JSON.stringify(context) === JSON.stringify(lastContextRef.current)) {
      return;
    }
    lastContextRef.current = context;

    // 이전 스케줄된 프리페칭 취소
    manager.cancelScheduled();

    const prev1Month = getAdjacentMonth(selectedMonth, -1);
    const prev2Month = getAdjacentMonth(selectedMonth, -2);
    const nextMonth = getAdjacentMonth(selectedMonth, 1);

    // ==========================================
    // 1단계: 현재 탭 핵심 데이터 (즉시)
    // ==========================================
    if (activeTab === 'household') {
      // 가계분석 탭: 도넛차트 + 막대그래프
      prefetchTransactions(selectedMonth, 'all', true);
      prefetchTrend(5, 'expense');
      prefetchTrend(5, 'income');
    } else if (activeTab === 'expense') {
      // 지출 탭
      prefetchTransactions(selectedMonth, 'expense', true);
      prefetchMonthly(selectedMonth, 'expense');
    } else if (activeTab === 'income') {
      // 소득 탭
      prefetchTransactions(selectedMonth, 'income', true);
      prefetchMonthly(selectedMonth, 'income');
    }

    // ==========================================
    // 2단계: 인접 월 데이터 (idle - high priority)
    // ==========================================
    manager.scheduleIdlePrefetch(() => {
      // 이전 1개월
      prefetchTransactions(prev1Month, 'all', true);
      prefetchMonthly(prev1Month, 'expense');
      prefetchMonthly(prev1Month, 'income');

      // 현재 월 소득/지출 (가계분석 탭이 아닌 경우 보완)
      if (activeTab !== 'expense') {
        prefetchTransactions(selectedMonth, 'expense', true);
        prefetchMonthly(selectedMonth, 'expense');
      }
      if (activeTab !== 'income') {
        prefetchTransactions(selectedMonth, 'income', true);
        prefetchMonthly(selectedMonth, 'income');
      }
    }, 'high');

    // ==========================================
    // 3단계: 확장 데이터 (idle - low priority)
    // ==========================================
    manager.scheduleIdlePrefetch(() => {
      // 2개월 전, 다음 월
      prefetchTransactions(prev2Month, 'all', true);
      prefetchMonthly(prev2Month, 'expense');
      prefetchMonthly(prev2Month, 'income');

      prefetchTransactions(nextMonth, 'all', true);
      prefetchMonthly(nextMonth, 'expense');
      prefetchMonthly(nextMonth, 'income');

      // 8개월 추세 (6개월 기간 선택 대비)
      prefetchTrend(8, 'expense');
      prefetchTrend(8, 'income');
    }, 'low');

    // ==========================================
    // 4단계: 장기 추세 데이터 (idle - low priority)
    // ==========================================
    manager.scheduleIdlePrefetch(() => {
      // 14개월 추세 (12개월 기간 선택 대비)
      prefetchTrend(14, 'expense');
      prefetchTrend(14, 'income');
    }, 'low');

    // ==========================================
    // 5단계: 최장기 추세 데이터 (idle - low priority)
    // ==========================================
    manager.scheduleIdlePrefetch(() => {
      // 26개월 추세 (24개월 기간 선택 대비)
      prefetchTrend(26, 'expense');
      prefetchTrend(26, 'income');
    }, 'low');

    // cleanup
    return () => {
      manager.cancelScheduled();
    };
  }, [
    selectedMonth,
    selectedOwner,
    activeTab,
    manager,
    prefetchMonthly,
    prefetchTrend,
    prefetchTransactions,
  ]);

  // UI를 렌더링하지 않음
  return null;
}
