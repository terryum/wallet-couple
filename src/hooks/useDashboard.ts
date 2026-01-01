/**
 * 대시보드 관련 React Query 훅
 */

'use client';

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Category, Owner } from '@/types';
import { mapSummaryToAggregation } from '@/lib/dashboard/transform';

/** 이전/다음 월 계산 */
function getAdjacentMonth(yearMonth: string, delta: number): string {
  const [year, month] = yearMonth.split('-').map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/** 월별 카테고리 집계 */
interface CategoryAggregation {
  category: Category;
  total_amount: number;
  count: number;
}

/** 월별 집계 응답 */
interface MonthlyAggregationResponse {
  success: boolean;
  data: CategoryAggregation[];
  month: string;
  total: number;
  totalCount: number;
  error?: string;
}

/** 여러 월 집계 데이터 */
interface MultiMonthData {
  month: string;
  total: number;
  totalCount: number;
  byCategory: CategoryAggregation[];
}

/** 월별 집계 데이터 조회 (대시보드용 - 지출만) */
async function fetchMonthlyAggregation(
  month: string,
  owner?: Owner
): Promise<MonthlyAggregationResponse> {
  const params = new URLSearchParams();
  params.set('month', month);
  params.set('include_summary', 'true');
  params.set('transaction_type', 'expense'); // 대시보드는 지출만 분석
  if (owner) params.set('owner', owner);

  const res = await fetch(`/api/transactions?${params.toString()}`);
  if (!res.ok) {
    throw new Error('데이터를 불러오는데 실패했습니다.');
  }

  const json = await res.json();

  const { byCategory, totalCount, total } = mapSummaryToAggregation(json.summary);

  return {
    success: json.success,
    data: byCategory,
    month,
    total,
    totalCount,
    error: json.error,
  };
}

/** 여러 월의 집계 데이터 조회 */
async function fetchMultiMonthAggregation(
  months: string[],
  owner?: Owner
): Promise<MultiMonthData[]> {
  const results = await Promise.all(
    months.map(async (month) => {
      const data = await fetchMonthlyAggregation(month, owner);
      return {
        month,
        total: data.total,
        totalCount: data.totalCount,
        byCategory: data.data,
      };
    })
  );
  return results;
}

/** 최근 N개월 목록 생성 */
export function getRecentMonths(count: number): string[] {
  const months: string[] = [];
  const now = new Date();

  for (let i = 0; i < count; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    months.push(`${year}-${month}`);
  }

  return months.reverse(); // 오래된 순서로
}

/** 월별 카테고리 집계 훅 (인접 월 프리페칭 포함) */
export function useMonthlyAggregation(month: string, owner?: Owner) {
  const queryClient = useQueryClient();

  // 인접 월 프리페칭
  useEffect(() => {
    const prefetchMonth = (targetMonth: string) => {
      queryClient.prefetchQuery({
        queryKey: ['dashboard', 'monthly', targetMonth, owner],
        queryFn: () => fetchMonthlyAggregation(targetMonth, owner),
        staleTime: 1000 * 60 * 5,
      });
    };

    const prevMonth = getAdjacentMonth(month, -1);
    const nextMonth = getAdjacentMonth(month, 1);

    prefetchMonth(prevMonth);
    prefetchMonth(nextMonth);
  }, [month, owner, queryClient]);

  return useQuery({
    queryKey: ['dashboard', 'monthly', month, owner],
    queryFn: () => fetchMonthlyAggregation(month, owner),
    staleTime: 1000 * 60 * 5,
    placeholderData: (previousData) => previousData,
  });
}

/** 여러 월 집계 훅 (추세 분석용) */
export function useMultiMonthAggregation(monthCount: number, owner?: Owner) {
  const months = getRecentMonths(monthCount);

  return useQuery({
    queryKey: ['dashboard', 'trend', monthCount, owner],
    queryFn: () => fetchMultiMonthAggregation(months, owner),
    staleTime: 1000 * 60 * 5,
  });
}
