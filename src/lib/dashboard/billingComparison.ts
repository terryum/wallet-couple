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

export interface BillingComparisonCardRow extends CardBilling {
  hasBilling: boolean;
}

export interface BillingComparisonRow extends MonthlyBilling {
  monthLabel: string;
  hasBilling: boolean;
  cards: BillingComparisonCardRow[];
}

export function formatBillingMonthLabel(month: string): string {
  const [year, monthPart] = month.split('-');
  return `${year}.${monthPart}`;
}

export function buildBillingComparisonRows(
  data: MonthlyBilling[]
): BillingComparisonRow[] {
  return data.map((item) => ({
    ...item,
    monthLabel: formatBillingMonthLabel(item.month),
    hasBilling: item.billing_amount > 0,
    cards: item.cards.map((card) => ({
      ...card,
      hasBilling: card.billing_amount > 0,
    })),
  }));
}
