/**
 * 카테고리 계산 공유 훅
 * PieChartCard와 StackedBarCard가 동일한 카테고리 목록을 사용하도록 함
 */

import { useMemo } from 'react';
import {
  MIN_CATEGORIES,
  MAX_CATEGORIES,
  getCategoryColor,
  type CategoryData,
  type ChartCategoryData,
  type CategoryCalculationResult,
} from '@/constants/chart';

interface UseCategoryCalculationOptions {
  minCategories?: number;
  maxCategories?: number;
}

/**
 * 카테고리별 금액 데이터를 차트용 데이터로 변환
 * - 상위 5~7개 카테고리 선정
 * - etc.가 항상 가장 작은 비중이 되도록 동적 결정
 */
export function useCategoryCalculation(
  data: CategoryData[] | undefined,
  total: number,
  options?: UseCategoryCalculationOptions
): CategoryCalculationResult {
  const minCats = options?.minCategories ?? MIN_CATEGORIES;
  const maxCats = options?.maxCategories ?? MAX_CATEGORIES;

  return useMemo(() => {
    if (!data || data.length === 0 || total === 0) {
      return {
        chartData: [],
        topCategories: [],
        etcCategories: [],
        etcTotal: 0,
      };
    }

    // 금액 내림차순 정렬
    const sorted = [...data].sort((a, b) => b.total_amount - a.total_amount);

    // etc.가 가장 작은 비중이 되도록 표시할 카테고리 수 결정
    let numCategories = minCats;

    for (let n = minCats; n <= Math.min(maxCats, sorted.length); n++) {
      const shown = sorted.slice(0, n);
      const etcSum = sorted.slice(n).reduce((sum, item) => sum + item.total_amount, 0);
      const smallestShown = shown[shown.length - 1]?.total_amount ?? 0;

      if (etcSum <= smallestShown || n === sorted.length) {
        numCategories = n;
        break;
      }
      numCategories = n;
    }

    // 표시할 카테고리와 etc. 분리
    const topItems = sorted.slice(0, numCategories);
    const etcItems = sorted.slice(numCategories);

    // 차트 데이터 생성
    const chartData: ChartCategoryData[] = topItems.map((item) => ({
      name: item.category,
      value: item.total_amount,
      percentage: (item.total_amount / total) * 100,
      color: getCategoryColor(item.category),
      count: item.count,
    }));

    // etc. 항목 추가
    const etcTotal = etcItems.reduce((sum, item) => sum + item.total_amount, 0);
    const etcCount = etcItems.reduce((sum, item) => sum + (item.count || 0), 0);

    if (etcItems.length > 0 && etcTotal > 0) {
      chartData.push({
        name: 'etc.',
        value: etcTotal,
        percentage: (etcTotal / total) * 100,
        color: getCategoryColor('etc.'),
        count: etcCount,
      });
    }

    return {
      chartData,
      topCategories: [...topItems.map((item) => item.category), ...(etcItems.length > 0 ? ['etc.'] : [])],
      etcCategories: etcItems.map((item) => item.category),
      etcTotal,
    };
  }, [data, total, minCats, maxCats]);
}

/**
 * 다중 월 데이터에서 카테고리 계산
 * StackedBarCard용 - 전체 기간의 합계 기준으로 top 카테고리 결정
 */
export function calculateCategoriesForPeriod(
  monthlyData: Array<{ month: string; total: number; byCategory: CategoryData[] }>,
  options?: UseCategoryCalculationOptions
): { topCategories: string[]; etcCategories: string[] } {
  const minCats = options?.minCategories ?? MIN_CATEGORIES;
  const maxCats = options?.maxCategories ?? MAX_CATEGORIES;

  if (!monthlyData || monthlyData.length === 0) {
    return { topCategories: [], etcCategories: [] };
  }

  // 전체 카테고리별 합계 계산
  const categoryTotals: Record<string, number> = {};
  for (const month of monthlyData) {
    for (const cat of month.byCategory) {
      categoryTotals[cat.category] = (categoryTotals[cat.category] || 0) + cat.total_amount;
    }
  }

  // 금액 내림차순 정렬
  const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);

  // etc.가 가장 작은 비중이 되도록 표시할 카테고리 수 결정
  let numCategories = minCats;

  for (let n = minCats; n <= Math.min(maxCats, sortedCategories.length); n++) {
    const shownCats = sortedCategories.slice(0, n);
    const etcSum = sortedCategories.slice(n).reduce((sum, [, val]) => sum + val, 0);
    const smallestShown = shownCats[shownCats.length - 1]?.[1] ?? 0;

    if (etcSum <= smallestShown || n === sortedCategories.length) {
      numCategories = n;
      break;
    }
    numCategories = n;
  }

  const topCategories = sortedCategories.slice(0, numCategories).map(([cat]) => cat);
  const etcCategories = sortedCategories.slice(numCategories).map(([cat]) => cat);

  // etc.가 있으면 목록에 추가
  if (etcCategories.length > 0) {
    topCategories.push('etc.');
  }

  return { topCategories, etcCategories };
}
