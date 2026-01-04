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
import { getAdjacentMonth } from '@/lib/utils/date';

export function DataPrefetcher() {
  const queryClient = useQueryClient();
  const { selectedMonth, selectedOwner, activeTab } = useAppContext();
  const lastContextRef = useRef({ month: '', owner: '', tab: '' });
  const manager = getPrefetchManager();

  // 인접 월 프리페칭 함수 (최소화)
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
          const res = await fetch(`/api/transactions?${params.toString()}`, {
            signal,
            priority: 'low' as RequestPriority,  // 프리페칭은 낮은 우선순위
          });
          if (!res.ok) throw new Error('Failed to fetch');
          return res.json();
        },
        staleTime: 1000 * 60 * 5,
      });
    },
    [queryClient, selectedOwner]
  );

  useEffect(() => {
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

    // ==========================================
    // 최소한의 프리페칭만 수행 (서버 과부하 방지)
    // - 인접 월 1개만 프리페칭
    // - 3초 대기 후 시작 (사용자가 탭에 머무를 때만)
    // ==========================================
    const prefetchTimerId = setTimeout(() => {
      if (manager.paused) return;

      // 이전 월만 프리페칭 (가장 자주 조회하는 데이터)
      prefetchTransactions(prev1Month, 'all', true);
    }, 3000); // 3초 후 시작

    // cleanup
    return () => {
      clearTimeout(prefetchTimerId);
      manager.cancelScheduled();
    };
  }, [selectedMonth, selectedOwner, activeTab, manager, prefetchTransactions]);

  // UI를 렌더링하지 않음
  return null;
}
