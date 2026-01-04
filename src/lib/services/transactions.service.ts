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
  totalCount: number;
  byCategory: { category: Category; total: number; count: number }[];
}

export interface TransactionsResult {
  data: Transaction[] | null;
  error: string | null;
  summary: TransactionSummary | null;
  /** 페이지네이션 정보 */
  pagination?: {
    totalCount: number;
    hasMore: boolean;
    limit?: number;
    offset: number;
  };
}

/**
 * 거래 내역 조회 + 요약 집계
 */
export async function fetchTransactionsWithSummary(
  params: TransactionQueryParams,
  includeSummary: boolean
): Promise<TransactionsResult> {
  const result = await getTransactions(params);
  if (result.error || !result.data) {
    return { data: null, error: result.error, summary: null };
  }

  const { data: transactions, totalCount, hasMore } = result.data;

  // 페이지네이션 정보
  const pagination = {
    totalCount,
    hasMore,
    limit: params.limit,
    offset: params.offset || 0,
  };

  if (!includeSummary) {
    return { data: transactions, error: null, summary: null, pagination };
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

  return { data: transactions, error: null, summary, pagination };
}
