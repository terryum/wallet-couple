import { describe, expect, it } from 'vitest';
import {
  buildBillingComparisonRows,
  formatBillingMonthLabel,
  type MonthlyBilling,
} from '@/lib/dashboard/billingComparison';

describe('billingComparison transform', () => {
  it('formatBillingMonthLabel는 YYYY.MM 형식을 만든다', () => {
    expect(formatBillingMonthLabel('2024-01')).toBe('2024.01');
  });

  it('buildBillingComparisonRows는 표시값과 hasBilling 플래그를 추가한다', () => {
    const input: MonthlyBilling[] = [
      {
        month: '2024-08',
        usage_amount: 120000,
        billing_amount: 0,
        cards: [
          { source_type: '현대카드', usage_amount: 80000, billing_amount: 0 },
          { source_type: '삼성카드', usage_amount: 40000, billing_amount: 25000 },
        ],
      },
    ];

    const result = buildBillingComparisonRows(input);

    expect(result[0].monthLabel).toBe('2024.08');
    expect(result[0].hasBilling).toBe(false);
    expect(result[0].cards[0].hasBilling).toBe(false);
    expect(result[0].cards[1].hasBilling).toBe(true);
  });
});
