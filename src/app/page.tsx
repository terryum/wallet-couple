/**
 * 메인 페이지 - 지출 내역 화면
 * TransactionPageContent 공통 컴포넌트 사용
 */

'use client';

import { TransactionPageContent } from '@/components/transactions';
import { ALL_EXPENSE_CATEGORIES } from '@/types';

export default function HomePage() {
  return (
    <TransactionPageContent
      transactionType="expense"
      categories={ALL_EXPENSE_CATEGORIES}
      modalIdBase="home"
    />
  );
}
