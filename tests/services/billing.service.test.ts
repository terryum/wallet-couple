import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getBillingComparison } from '@/lib/services/billing.service';
import * as repo from '@/lib/repositories/billing.repo';

vi.mock('@/lib/repositories/billing.repo', () => ({
  fetchUsageByDateRange: vi.fn(),
  fetchBillingFilesByMonth: vi.fn(),
}));

const mockedRepo = vi.mocked(repo);

describe('billing.service', () => {
  beforeEach(() => {
    mockedRepo.fetchUsageByDateRange.mockReset();
    mockedRepo.fetchBillingFilesByMonth.mockReset();
  });

  it('aggregates usage and billing per month', async () => {
    mockedRepo.fetchUsageByDateRange.mockResolvedValue({
      data: [
        { source_type: '현대카드', amount: 1000 },
        { source_type: '현대카드', amount: 2000 },
      ],
      error: null,
    });
    mockedRepo.fetchBillingFilesByMonth.mockResolvedValue({
      data: [{ source_type: '현대카드', billing_total: 3500 }],
      error: null,
    });

    const result = await getBillingComparison(1);
    expect(result.error).toBeNull();
    expect(result.data[0].usage_amount).toBe(3000);
    expect(result.data[0].billing_amount).toBe(3500);
  });
});
