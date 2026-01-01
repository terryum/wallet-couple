import {
  fetchUsageByDateRange,
  fetchBillingFilesByMonth,
  type BillingFileRow,
  type TransactionAmountRow,
} from '@/lib/repositories/billing.repo';

export interface CardBilling {
  source_type: string;
  usage_amount: number;
  billing_amount: number;
}

export interface MonthlyBilling {
  month: string;
  usage_amount: number;
  billing_amount: number;
  cards: CardBilling[];
}

function buildMonths(count: number): string[] {
  const months: string[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    months.push(`${year}-${month}`);
  }
  return months;
}

function aggregateUsage(rows: TransactionAmountRow[]): Record<string, number> {
  const usageByCard: Record<string, number> = {};
  rows.forEach((t) => {
    usageByCard[t.source_type] = (usageByCard[t.source_type] || 0) + t.amount;
  });
  return usageByCard;
}

function aggregateBilling(rows: BillingFileRow[]): Record<string, number> {
  const billingByCard: Record<string, number> = {};
  rows.forEach((f) => {
    if (f.billing_total) {
      billingByCard[f.source_type] = (billingByCard[f.source_type] || 0) + f.billing_total;
    }
  });
  return billingByCard;
}

export async function getBillingComparison(monthCount: number): Promise<{ data: MonthlyBilling[]; error: string | null }> {
  const months = buildMonths(monthCount);
  const result: MonthlyBilling[] = [];

  for (const month of months) {
    const startDate = `${month}-01`;
    const [year, monthNum] = month.split('-').map(Number);
    const lastDay = new Date(year, monthNum, 0).getDate();
    const endDate = `${month}-${String(lastDay).padStart(2, '0')}`;

    const usageResult = await fetchUsageByDateRange(startDate, endDate);
    if (usageResult.error) {
      return { data: [], error: usageResult.error };
    }

    const billingResult = await fetchBillingFilesByMonth(month);
    if (billingResult.error) {
      return { data: [], error: billingResult.error };
    }

    const usageByCard = aggregateUsage(usageResult.data || []);
    const billingByCard = aggregateBilling(billingResult.data || []);

    const allCardTypes = new Set([
      ...Object.keys(usageByCard),
      ...Object.keys(billingByCard),
    ]);

    const cards: CardBilling[] = [];
    let totalUsage = 0;
    let totalBilling = 0;

    for (const cardType of allCardTypes) {
      const usage = usageByCard[cardType] || 0;
      const billing = billingByCard[cardType] || 0;

      cards.push({
        source_type: cardType,
        usage_amount: usage,
        billing_amount: billing,
      });

      totalUsage += usage;
      totalBilling += billing;
    }

    if (totalUsage > 0 || totalBilling > 0) {
      result.push({
        month,
        usage_amount: totalUsage,
        billing_amount: totalBilling,
        cards: cards.sort((a, b) => b.usage_amount - a.usage_amount),
      });
    }
  }

  return { data: result, error: null };
}
