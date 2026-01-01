import type { Owner } from '@/types';
import {
  getTransactions,
  getMonthlyTotal,
  getMonthlyAggregation,
} from '@/lib/supabase/queries';

export { getTransactions };

export function fetchMonthlyTotal(
  month: string,
  owner: Owner | undefined,
  transactionType: 'expense' | 'income' | 'all'
) {
  return getMonthlyTotal(month, owner, transactionType);
}

export function fetchMonthlyAggregation(
  month: string,
  owner: Owner | undefined,
  transactionType: 'expense' | 'income' | 'all'
) {
  return getMonthlyAggregation(month, owner, transactionType);
}
