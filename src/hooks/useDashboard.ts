/**
 * 대시보드 관련 React Query 훅
 */

'use client';

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Category, Owner, TransactionType } from '@/types';
import { mapSummaryToAggregation } from '@/lib/dashboard/transform';
import { getAdjacentMonth, getRecentMonths as getRecentMonthsUtil } from '@/lib/utils/date';

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

/** 월별 집계 데이터 조회 */
async function fetchMonthlyAggregation(
  month: string,
  owner?: Owner,
  transactionType: TransactionType = 'expense'
): Promise<MonthlyAggregationResponse> {
  const params = new URLSearchParams();
  params.set('month', month);
  params.set('include_summary', 'true');
  params.set('transaction_type', transactionType);
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
  owner?: Owner,
  transactionType: TransactionType = 'expense'
): Promise<MultiMonthData[]> {
  const results = await Promise.all(
    months.map(async (month) => {
      const data = await fetchMonthlyAggregation(month, owner, transactionType);
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

/** 최근 N개월 목록 생성 (endMonth 기준) - date.ts에서 re-export */
export const getRecentMonths = getRecentMonthsUtil;

/** 월별 카테고리 집계 훅 (인접 월 프리페칭 포함) */
export function useMonthlyAggregation(
  month: string,
  owner?: Owner,
  transactionType: TransactionType = 'expense'
) {
  const queryClient = useQueryClient();

  // 인접 월 프리페칭
  useEffect(() => {
    const prefetchMonth = (targetMonth: string) => {
      queryClient.prefetchQuery({
        queryKey: ['dashboard', 'monthly', targetMonth, owner, transactionType],
        queryFn: () => fetchMonthlyAggregation(targetMonth, owner, transactionType),
        staleTime: 1000 * 60 * 5,
      });
    };

    const prevMonth = getAdjacentMonth(month, -1);
    const nextMonth = getAdjacentMonth(month, 1);

    prefetchMonth(prevMonth);
    prefetchMonth(nextMonth);
  }, [month, owner, transactionType, queryClient]);

  return useQuery({
    queryKey: ['dashboard', 'monthly', month, owner, transactionType],
    queryFn: () => fetchMonthlyAggregation(month, owner, transactionType),
    staleTime: 1000 * 60 * 5,
    placeholderData: (previousData) => previousData,
  });
}

/** 여러 월 집계 훅 (추세 분석용) */
export function useMultiMonthAggregation(
  monthCount: number,
  owner?: Owner,
  transactionType: TransactionType = 'expense',
  endMonth?: string
) {
  const months = getRecentMonths(monthCount, endMonth);

  return useQuery({
    queryKey: ['dashboard', 'trend', monthCount, owner, transactionType, endMonth],
    queryFn: () => fetchMultiMonthAggregation(months, owner, transactionType),
    staleTime: 1000 * 60 * 5,
  });
}

// ============================================
// 가계분석용: 소득+지출 동시 조회
// ============================================

/** 소득+지출 월별 집계 응답 */
interface BothMonthlyAggregationResponse {
  income: MonthlyAggregationResponse;
  expense: MonthlyAggregationResponse;
  isLoading: boolean;
}

/** 소득+지출 월별 집계 훅 */
export function useMonthlyBothAggregation(
  month: string,
  owner?: Owner
): BothMonthlyAggregationResponse {
  const incomeQuery = useMonthlyAggregation(month, owner, 'income');
  const expenseQuery = useMonthlyAggregation(month, owner, 'expense');

  return {
    income: incomeQuery.data ?? {
      success: false,
      data: [],
      month,
      total: 0,
      totalCount: 0,
    },
    expense: expenseQuery.data ?? {
      success: false,
      data: [],
      month,
      total: 0,
      totalCount: 0,
    },
    isLoading: incomeQuery.isLoading || expenseQuery.isLoading,
  };
}

/** 소득+지출 여러 월 집계 데이터 */
export interface CombinedMonthData {
  month: string;       // "1월"
  fullMonth: string;   // "2025-01"
  income: number;
  expense: number;
  balance: number;     // income - expense
  incomeByCategory: CategoryAggregation[];
  expenseByCategory: CategoryAggregation[];
  isExtended?: boolean; // 확장 데이터 여부 (손익선 연장용)
}

/** 소득+지출 여러 월 집계 훅 */
export function useMultiMonthBothAggregation(
  monthCount: number,
  owner?: Owner,
  endMonth?: string,
  includeExtended?: boolean // 손익선 연장을 위한 전후 1개월 포함
) {
  // 확장 데이터 포함 시 전후 1개월씩 추가 조회
  const extendedCount = includeExtended ? monthCount + 2 : monthCount;
  const extendedEndMonth = includeExtended && endMonth
    ? getAdjacentMonth(endMonth, 1)
    : endMonth;

  const incomeQuery = useMultiMonthAggregation(extendedCount, owner, 'income', extendedEndMonth);
  const expenseQuery = useMultiMonthAggregation(extendedCount, owner, 'expense', extendedEndMonth);

  const combinedData: CombinedMonthData[] = [];

  if (incomeQuery.data && expenseQuery.data) {
    for (let i = 0; i < incomeQuery.data.length; i++) {
      const incomeMonth = incomeQuery.data[i];
      const expenseMonth = expenseQuery.data[i];

      // 확장 데이터인지 표시 (첫 번째와 마지막)
      const isExtended = includeExtended && (i === 0 || i === incomeQuery.data.length - 1);

      combinedData.push({
        month: `${parseInt(incomeMonth.month.slice(5))}월`,
        fullMonth: incomeMonth.month,
        income: incomeMonth.total,
        expense: expenseMonth?.total || 0,
        balance: incomeMonth.total - (expenseMonth?.total || 0),
        incomeByCategory: incomeMonth.byCategory,
        expenseByCategory: expenseMonth?.byCategory || [],
        isExtended,
      });
    }
  }

  return {
    data: combinedData,
    isLoading: incomeQuery.isLoading || expenseQuery.isLoading,
  };
}

// ============================================
// 카테고리별 트렌드 조회
// ============================================

/** 카테고리별 트렌드 데이터 */
export interface CategoryTrendData {
  month: string;       // "1월"
  fullMonth: string;   // "2025-01"
  amount: number;
}

/** 특정 카테고리의 월별 트렌드 조회 */
export function useCategoryTrend(
  monthCount: number,
  category: Category | null,
  transactionType: TransactionType,
  owner?: Owner,
  endMonth?: string
) {
  const multiMonthQuery = useMultiMonthAggregation(monthCount, owner, transactionType, endMonth);

  const trendData: CategoryTrendData[] = [];

  if (multiMonthQuery.data && category) {
    for (const monthData of multiMonthQuery.data) {
      const categoryData = monthData.byCategory.find((c) => c.category === category);
      trendData.push({
        month: `${parseInt(monthData.month.slice(5))}월`,
        fullMonth: monthData.month,
        amount: categoryData?.total_amount || 0,
      });
    }
  }

  return {
    data: trendData,
    isLoading: multiMonthQuery.isLoading,
  };
}

// Re-export types for external use
export type { CategoryAggregation, MonthlyAggregationResponse, MultiMonthData };
