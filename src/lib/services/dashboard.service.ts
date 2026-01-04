import type { Category, Owner } from '@/types';
import {
  fetchMonthlyAggregation,
  fetchMonthlyTotal,
} from '@/lib/repositories/transactions.repo';

export interface MonthlySummary {
  total: number;
  totalCount: number;
  byCategory: { category: Category; total: number; count: number }[];
}

export async function fetchMonthlySummary(
  month: string,
  owner: Owner | undefined,
  transactionType: 'expense' | 'income' | 'all'
): Promise<MonthlySummary> {
  const [totalResult, aggregationResult] = await Promise.all([
    fetchMonthlyTotal(month, owner, transactionType),
    fetchMonthlyAggregation(month, owner, transactionType),
  ]);

  const byCategory = aggregationResult.data || [];
  // totalCount는 각 카테고리의 count 합계
  const totalCount = byCategory.reduce((sum, cat) => sum + cat.count, 0);

  return {
    total: totalResult.data || 0,
    totalCount,
    byCategory,
  };
}
