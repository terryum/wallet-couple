import type {
  Transaction,
  TransactionQueryParams,
  Category,
  Owner,
} from '@/types';
import { getTransactions } from '@/lib/repositories/transactions.repo';
import { fetchMonthlySummary } from '@/lib/services/dashboard.service';

export interface TransactionSummary {
  total: number;
  byCategory: { category: Category; total: number; count: number }[];
}

export interface TransactionsResult {
  data: Transaction[] | null;
  error: string | null;
  summary: TransactionSummary | null;
}

/**
 * 거래 내역 조회 + 요약 집계
 */
export async function fetchTransactionsWithSummary(
  params: TransactionQueryParams,
  includeSummary: boolean
): Promise<TransactionsResult> {
  const result = await getTransactions(params);
  if (result.error) {
    return { data: null, error: result.error, summary: null };
  }

  if (!includeSummary) {
    return { data: result.data, error: null, summary: null };
  }

  const transactionType =
    params.transactionType === 'all'
      ? 'all'
      : (params.transactionType || 'expense');

  const summary = await fetchMonthlySummary(
    params.month,
    params.owner as Owner | undefined,
    transactionType
  );

  return { data: result.data, error: null, summary };
}
