import type { Category, Owner } from '@/types';
import {
  fetchMonthlyAggregation,
  fetchMonthlyTotal,
} from '@/lib/repositories/transactions.repo';

export interface MonthlySummary {
  total: number;
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

  return {
    total: totalResult.data || 0,
    byCategory: aggregationResult.data || [],
  };
}
