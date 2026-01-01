import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { Transaction } from '@/types';
import * as repo from '@/lib/repositories/transactions.repo';
import { fetchTransactionsWithSummary } from '@/lib/services/transactions.service';

vi.mock('@/lib/repositories/transactions.repo', () => ({
  getTransactions: vi.fn(),
  fetchMonthlyTotal: vi.fn(),
  fetchMonthlyAggregation: vi.fn(),
}));

const mockedRepo = vi.mocked(repo);

describe('transactions.service', () => {
  beforeEach(() => {
    mockedRepo.getTransactions.mockReset();
    mockedRepo.fetchMonthlyTotal.mockReset();
    mockedRepo.fetchMonthlyAggregation.mockReset();
  });

  it('returns data without summary when includeSummary is false', async () => {
    const data: Transaction[] = [
      {
        id: '1',
        transaction_date: '2025-12-01',
        merchant_name: '테스트',
        amount: 1000,
        category: '기타',
        memo: null,
        source_type: '현대카드',
        owner: 'husband',
        is_deleted: false,
        transaction_type: 'expense',
        raw_data: null,
        created_at: '2025-12-01T00:00:00Z',
      },
    ];
    mockedRepo.getTransactions.mockResolvedValue({ data, error: null });

    const result = await fetchTransactionsWithSummary(
      { month: '2025-12' },
      false
    );

    expect(result.data).toEqual(data);
    expect(result.summary).toBeNull();
  });

  it('returns summary when includeSummary is true', async () => {
    mockedRepo.getTransactions.mockResolvedValue({ data: [], error: null });
    mockedRepo.fetchMonthlyTotal.mockResolvedValue({ data: 3000, error: null });
    mockedRepo.fetchMonthlyAggregation.mockResolvedValue({
      data: [{ category: '기타', total: 3000, count: 2 }],
      error: null,
    });

    const result = await fetchTransactionsWithSummary(
      { month: '2025-12', transactionType: 'expense' },
      true
    );

    expect(result.summary?.total).toBe(3000);
    expect(result.summary?.byCategory).toEqual([
      { category: '기타', total: 3000, count: 2 },
    ]);
  });
});
