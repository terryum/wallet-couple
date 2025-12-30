/**
 * 청구금액 비교 데이터 훅
 */

'use client';

import { useQuery } from '@tanstack/react-query';

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

interface BillingComparisonResponse {
  success: boolean;
  data: MonthlyBilling[];
  error?: string;
}

async function fetchBillingComparison(months: number): Promise<MonthlyBilling[]> {
  const res = await fetch(`/api/billing-comparison?months=${months}`);
  if (!res.ok) {
    throw new Error('청구금액 데이터를 불러오는데 실패했습니다.');
  }
  const json: BillingComparisonResponse = await res.json();
  if (!json.success) {
    throw new Error(json.error || '데이터 조회 실패');
  }
  return json.data;
}

export function useBillingComparison(months: number = 12) {
  return useQuery({
    queryKey: ['billing-comparison', months],
    queryFn: () => fetchBillingComparison(months),
    staleTime: 1000 * 60 * 5, // 5분
  });
}
