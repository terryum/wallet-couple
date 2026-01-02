/**
 * 소득 내역 페이지
 * TransactionPageContent 공통 컴포넌트 사용 (지출 탭과 완전히 동일)
 */

'use client';

import { TransactionPageContent } from '@/components/transactions';
import { INCOME_CATEGORIES } from '@/types';

export default function IncomePage() {
  return (
    <TransactionPageContent
      transactionType="income"
      categories={INCOME_CATEGORIES}
      modalIdBase="income"
    />
  );
}
