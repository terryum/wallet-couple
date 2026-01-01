import { describe, expect, it } from 'vitest';
import { mapSummaryToAggregation } from '@/lib/dashboard/transform';

describe('dashboard/transform', () => {
  it('maps summary to category aggregation and counts', () => {
    const result = mapSummaryToAggregation({
      total: 3000,
      byCategory: [
        { category: '기타', total: 1000, count: 1 },
        { category: '외식/커피', total: 2000, count: 2 },
      ],
    });

    expect(result.total).toBe(3000);
    expect(result.totalCount).toBe(3);
    expect(result.byCategory[0].total_amount).toBe(1000);
  });
});
