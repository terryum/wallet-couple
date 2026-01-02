/**
 * 지출 분석 페이지
 * DashboardPageContent 공통 컴포넌트 사용
 */

'use client';

import { DashboardPageContent } from '@/components/dashboard';

export default function DashboardPage() {
  return (
    <DashboardPageContent
      transactionType="expense"
      modalIdBase="dashboard"
      categoryClickPath="/"
      showBillingComparison={true}
    />
  );
}
