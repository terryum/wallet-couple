/**
 * 가계분석 AI 인사이트 React Query 훅
 * - stale-while-revalidate 패턴
 * - localStorage 캐싱
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Owner, Category } from '@/types';
import {
  getCachedPieInsight,
  setCachedPieInsight,
  getCachedTrendInsight,
  setCachedTrendInsight,
  generateDataHash,
} from '@/lib/cache/insightCache';

interface CategoryAggregation {
  category: Category;
  total_amount: number;
  count?: number;
}

// ============ 도넛차트 인사이트 ============

interface UsePieInsightOptions {
  month: string;
  owner?: Owner;
  incomeData: CategoryAggregation[];
  incomeTotal: number;
  expenseData: CategoryAggregation[];
  expenseTotal: number;
  previousAvg?: {
    incomeTotal: number;
    expenseTotal: number;
    incomeByCategory: CategoryAggregation[];
    expenseByCategory: CategoryAggregation[];
  };
  enabled?: boolean;
}

interface InsightResult {
  insight: string | null;
  isLoading: boolean;
  error: Error | null;
}

async function fetchPieInsight(
  month: string,
  owner: Owner | undefined,
  currentData: {
    incomeTotal: number;
    expenseTotal: number;
    incomeByCategory: CategoryAggregation[];
    expenseByCategory: CategoryAggregation[];
  },
  previousAvg: {
    incomeTotal: number;
    expenseTotal: number;
    incomeByCategory: CategoryAggregation[];
    expenseByCategory: CategoryAggregation[];
  }
): Promise<string> {
  const res = await fetch('/api/insights/household', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'pie',
      month,
      owner,
      currentData,
      previousAvg,
    }),
  });

  if (!res.ok) {
    throw new Error('인사이트 로드 실패');
  }

  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error || '인사이트 생성 실패');
  }

  return json.insight;
}

export function usePieInsight(options: UsePieInsightOptions): InsightResult {
  const {
    month,
    owner,
    incomeData,
    incomeTotal,
    expenseData,
    expenseTotal,
    previousAvg,
    enabled = true,
  } = options;

  // 데이터 해시 생성
  const dataHash = useMemo(() => {
    const topCategories = expenseData
      .sort((a, b) => b.total_amount - a.total_amount)
      .slice(0, 5)
      .map((c) => c.category);
    return generateDataHash({ incomeTotal, expenseTotal, topCategories });
  }, [incomeTotal, expenseTotal, expenseData]);

  // 로컬 캐시에서 인사이트 확인
  const [cachedInsight, setCachedInsight] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !month) return;
    const cached = getCachedPieInsight(month, owner, dataHash);
    if (cached) {
      setCachedInsight(cached);
    } else {
      setCachedInsight(null);
    }
  }, [month, owner, dataHash, enabled]);

  // 기본 previousAvg (제공되지 않은 경우)
  const defaultPreviousAvg = useMemo(
    () => ({
      incomeTotal: incomeTotal,
      expenseTotal: expenseTotal,
      incomeByCategory: incomeData,
      expenseByCategory: expenseData,
    }),
    [incomeTotal, expenseTotal, incomeData, expenseData]
  );

  const actualPreviousAvg = previousAvg || defaultPreviousAvg;

  // React Query로 API 호출
  const query = useQuery({
    queryKey: ['insight', 'pie', month, owner, dataHash],
    queryFn: () =>
      fetchPieInsight(
        month,
        owner,
        {
          incomeTotal,
          expenseTotal,
          incomeByCategory: incomeData,
          expenseByCategory: expenseData,
        },
        actualPreviousAvg
      ),
    enabled: enabled && !!month && incomeTotal + expenseTotal > 0 && !cachedInsight,
    staleTime: 1000 * 60 * 10, // 10분
    retry: 1,
    retryDelay: 1000,
  });

  // API 응답 시 캐시 저장
  useEffect(() => {
    if (query.data && month) {
      setCachedPieInsight(month, owner, query.data, dataHash);
    }
  }, [query.data, month, owner, dataHash]);

  // 캐시 또는 API 데이터 반환
  const insight = cachedInsight || query.data || null;

  return {
    insight,
    isLoading: !cachedInsight && query.isLoading,
    error: query.error as Error | null,
  };
}

// ============ 추세차트 인사이트 ============

interface TrendMonthData {
  month: string;
  fullMonth?: string;
  income: number;
  expense: number;
  balance: number;
  incomeByCategory: CategoryAggregation[];
  expenseByCategory: CategoryAggregation[];
}

interface UseTrendInsightOptions {
  period: string;
  owner?: Owner;
  trendData: TrendMonthData[];
  enabled?: boolean;
}

async function fetchTrendInsight(
  period: string,
  owner: Owner | undefined,
  trendData: TrendMonthData[]
): Promise<string> {
  // isExtended 데이터 제외
  const filteredData = trendData.filter(
    (d) => !(d as TrendMonthData & { isExtended?: boolean }).isExtended
  );

  const res = await fetch('/api/insights/household', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'trend',
      period,
      owner,
      trendData: filteredData.map((d) => ({
        month: d.month,
        income: d.income,
        expense: d.expense,
        balance: d.balance,
        incomeByCategory: d.incomeByCategory,
        expenseByCategory: d.expenseByCategory,
      })),
    }),
  });

  if (!res.ok) {
    throw new Error('인사이트 로드 실패');
  }

  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error || '인사이트 생성 실패');
  }

  return json.insight;
}

export function useTrendInsight(options: UseTrendInsightOptions): InsightResult {
  const { period, owner, trendData, enabled = true } = options;

  // 데이터 해시 생성 (추세 데이터 기반)
  const dataHash = useMemo(() => {
    // isExtended 제외한 데이터만 사용
    const filteredData = trendData.filter(
      (d) => !(d as TrendMonthData & { isExtended?: boolean }).isExtended
    );
    const totalIncome = filteredData.reduce((sum, d) => sum + d.income, 0);
    const totalExpense = filteredData.reduce((sum, d) => sum + d.expense, 0);

    // 전체 기간 카테고리 합계
    const categoryTotals = new Map<string, number>();
    filteredData.forEach((d) => {
      d.expenseByCategory.forEach((c) => {
        categoryTotals.set(
          c.category,
          (categoryTotals.get(c.category) || 0) + c.total_amount
        );
      });
    });

    const topCategories = [...categoryTotals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cat]) => cat);

    return generateDataHash({
      incomeTotal: totalIncome,
      expenseTotal: totalExpense,
      topCategories,
    });
  }, [trendData]);

  // 로컬 캐시에서 인사이트 확인
  const [cachedInsight, setCachedInsightState] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !period) return;
    const cached = getCachedTrendInsight(period, owner, dataHash);
    if (cached) {
      setCachedInsightState(cached);
    } else {
      setCachedInsightState(null);
    }
  }, [period, owner, dataHash, enabled]);

  // 유효한 데이터 있는지 확인
  const hasValidData = useMemo(() => {
    const filteredData = trendData.filter(
      (d) => !(d as TrendMonthData & { isExtended?: boolean }).isExtended
    );
    return filteredData.length > 0;
  }, [trendData]);

  // React Query로 API 호출
  const query = useQuery({
    queryKey: ['insight', 'trend', period, owner, dataHash],
    queryFn: () => fetchTrendInsight(period, owner, trendData),
    enabled: enabled && hasValidData && !cachedInsight,
    staleTime: 1000 * 60 * 10, // 10분
    retry: 1,
    retryDelay: 1000,
  });

  // API 응답 시 캐시 저장
  useEffect(() => {
    if (query.data && period) {
      setCachedTrendInsight(period, owner, query.data, dataHash);
    }
  }, [query.data, period, owner, dataHash]);

  // 캐시 또는 API 데이터 반환
  const insight = cachedInsight || query.data || null;

  return {
    insight,
    isLoading: !cachedInsight && query.isLoading,
    error: query.error as Error | null,
  };
}
