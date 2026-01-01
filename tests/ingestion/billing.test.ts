import { describe, expect, it } from 'vitest';
import type { ParsedTransaction } from '@/types';
import {
  extractBillingMonthFromFilename,
  extractBillingMonthFromTransactions,
  generateDisplayName,
  getInstallmentDate,
} from '@/lib/ingestion/billing';

describe('ingestion/billing', () => {
  it('extracts billing month from filename patterns', () => {
    expect(extractBillingMonthFromFilename('card_202512.xlsx')).toBe('2025-12');
    expect(extractBillingMonthFromFilename('card_2025-12.xlsx')).toBe('2025-12');
    expect(extractBillingMonthFromFilename('card_2025_12.xlsx')).toBe('2025-12');
    expect(extractBillingMonthFromFilename('2025년 3월 내역.xlsx')).toBe('2025-03');
  });

  it('extracts billing month from latest non-installment transaction', () => {
    const items: ParsedTransaction[] = [
      {
        date: '2025-10-05',
        merchant: 'A',
        amount: 1000,
        category: '기타',
        is_installment: true,
        transaction_type: 'expense',
      },
      {
        date: '2025-11-15',
        merchant: 'B',
        amount: 2000,
        category: '기타',
        is_installment: false,
        transaction_type: 'expense',
      },
    ];

    expect(extractBillingMonthFromTransactions(items)).toBe('2025-11');
  });

  it('generates display name with billing month', () => {
    const name = generateDisplayName('sample.xlsx', '현대카드', 'husband', '2025-12');
    expect(name).toContain('2025년_12월');
    expect(name).toContain('남편');
    expect(name).toContain('현대카드');
  });

  it('returns installment date using billing month', () => {
    expect(getInstallmentDate('2025-01-10', '2025-12')).toBe('2025-12-25');
  });
});
