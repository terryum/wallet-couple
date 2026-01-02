/**
 * 소득 분석 페이지
 * DashboardPageContent 공통 컴포넌트 사용 (지출분석 탭과 완전히 동일)
 */

'use client';

import { DashboardPageContent } from '@/components/dashboard';

export default function IncomeDashboardPage() {
  return (
    <DashboardPageContent
      transactionType="income"
      modalIdBase="income-dashboard"
      categoryClickPath="/income"
      showBillingComparison={false}
    />
  );
}
