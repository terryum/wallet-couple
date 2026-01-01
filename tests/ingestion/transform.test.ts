import { describe, expect, it } from 'vitest';
import type { ParsedTransaction } from '@/types';
import { buildTransactionsWithFileId } from '@/lib/ingestion/transform';

describe('ingestion/transform', () => {
  it('builds transactions with installment date and category map', () => {
    const mapped: ParsedTransaction[] = [
      {
        date: '2025-12-01',
        merchant: 'A',
        amount: 1000,
        category: '기타',
        is_installment: true,
        transaction_type: 'expense',
      },
      {
        date: '2025-12-02',
        merchant: 'B',
        amount: 2000,
        category: '기타',
        is_installment: false,
        transaction_type: 'income',
      },
    ];

    const categoryMap = new Map<number, '기타' | '급여'>();
    categoryMap.set(1, '급여');

    const result = buildTransactionsWithFileId({
      mappedData: mapped,
      originalData: mapped,
      categoryMap,
      installmentIndices: new Set([0]),
      billingMonth: '2025-11',
      sourceType: '우리은행',
      owner: 'husband',
      fileId: 'file-1',
    });

    expect(result[0].transaction_date).toBe('2025-11-25');
    expect(result[0].category).toBe('기존할부');
    expect(result[1].category).toBe('급여');
    expect(result[1].transaction_type).toBe('income');
    expect(result[1].file_id).toBe('file-1');
  });
});
