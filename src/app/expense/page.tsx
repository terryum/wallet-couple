/**
 * 지출 내역 페이지
 * TransactionPageContent 공통 컴포넌트 사용
 */

'use client';

import { TransactionPageContent } from '@/components/transactions';
import { ALL_EXPENSE_CATEGORIES } from '@/types';

export default function ExpensePage() {
  return (
    <TransactionPageContent
      transactionType="expense"
      categories={ALL_EXPENSE_CATEGORIES}
      modalIdBase="expense"
    />
  );
}
