import type { Category } from '@/types';

export interface SummaryItem {
  category: Category;
  total: number;
  count: number;
}

export interface SummaryPayload {
  total: number;
  byCategory: SummaryItem[];
}

export interface CategoryAggregation {
  category: Category;
  total_amount: number;
  count: number;
}

export function mapSummaryToAggregation(summary?: SummaryPayload) {
  const byCategory = (summary?.byCategory || []).map((item) => ({
    category: item.category,
    total_amount: item.total ?? 0,
    count: item.count ?? 0,
  }));

  const totalCount = byCategory.reduce((sum, item) => sum + item.count, 0);
  const total = summary?.total || 0;

  return { byCategory, totalCount, total };
}
