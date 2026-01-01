import { describe, expect, it } from 'vitest';
import { buildManualTransactions } from '@/lib/ingestion/manual';
import type { ParsedTransaction } from '@/types';

describe('ingestion/manual', () => {
  it('builds manual transactions with owner and source type', () => {
    const items: ParsedTransaction[] = [
      {
        date: '2025-12-01',
        merchant: '테스트',
        amount: 1234,
        category: '기타',
        is_installment: false,
        transaction_type: 'expense',
      },
    ];

    const result = buildManualTransactions(items, 'wife');
    expect(result[0].owner).toBe('wife');
    expect(result[0].source_type).toBe('직접입력');
    expect(result[0].merchant_name).toBe('테스트');
  });
});
