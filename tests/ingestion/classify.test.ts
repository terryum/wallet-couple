import { describe, expect, it } from 'vitest';
import type { ParsedTransaction } from '@/types';
import {
  prepareClassificationInputs,
  mergeCategoryMaps,
} from '@/lib/ingestion/classify';

describe('ingestion/classify', () => {
  const items: ParsedTransaction[] = [
    {
      date: '2025-12-01',
      merchant: 'A',
      amount: 1000,
      category: '기타',
      is_installment: false,
      transaction_type: 'expense',
    },
    {
      date: '2025-12-02',
      merchant: 'B',
      amount: 2000,
      category: '쇼핑',
      is_installment: false,
      transaction_type: 'expense',
    },
    {
      date: '2025-12-03',
      merchant: 'C',
      amount: 3000,
      category: '기타소득',
      is_installment: false,
      transaction_type: 'income',
    },
    {
      date: '2025-12-04',
      merchant: 'D',
      amount: 4000,
      category: '급여',
      is_installment: false,
      transaction_type: 'income',
    },
    {
      date: '2025-12-05',
      merchant: 'E',
      amount: 5000,
      category: '기타',
      is_installment: true,
      transaction_type: 'expense',
    },
  ];

  it('prepares inputs for all mode (except installments)', () => {
    const prep = prepareClassificationInputs(items, 'all');
    expect(prep.expenseInputs.length).toBe(2);
    expect(prep.incomeInputs.length).toBe(2);
    expect(prep.installmentIndices.has(4)).toBe(true);
  });

  it('prepares inputs for defaultOnly mode (only 기타/기타소득)', () => {
    const prep = prepareClassificationInputs(items, 'defaultOnly');
    expect(prep.expenseInputs.length).toBe(1); // 기타
    expect(prep.incomeInputs.length).toBe(1); // 기타소득
    expect(prep.presetIndices.has(1)).toBe(true); // 쇼핑
    expect(prep.presetIndices.has(3)).toBe(true); // 급여
  });

  it('merges expense/income category maps', () => {
    const merged = mergeCategoryMaps(
      new Map([
        [0, '기타'],
        [1, '쇼핑'],
      ]),
      new Map([
        [2, '기타소득'],
      ])
    );

    expect(merged.get(0)).toBe('기타');
    expect(merged.get(1)).toBe('쇼핑');
    expect(merged.get(2)).toBe('기타소득');
  });
});
