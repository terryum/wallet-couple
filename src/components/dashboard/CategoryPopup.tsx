/**
 * 카테고리 상세 팝업 - PieChartCard, StackedBarCard 공유
 * category가 '전체'인 경우 해당 월의 모든 거래 내역 표시
 * 거래 항목 클릭 시 EditModal로 수정 가능
 */

'use client';

import { useMemo, useCallback, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { formatNumber, formatYearMonth, formatShortDate } from '@/lib/utils/format';
import { useTransactions } from '@/hooks/useTransactions';
import { useModalBackHandler } from '@/hooks/useModalBackHandler';
import { EditModal } from '@/components/transactions/EditModal';
import { SimilarTransactionsModal } from '@/components/transactions/SimilarTransactionsModal';
import { useQueryClient } from '@tanstack/react-query';
import type { Category, Transaction } from '@/types';

interface CategoryPopupProps {
  isOpen: boolean;
  onClose: () => void;
  category: string | null; // '전체'인 경우 모든 거래 표시
  etcCategories?: string[];
  month: string; // YYYY-MM 형식
  totalAmount?: number;
}

export function CategoryPopup({
  isOpen,
  onClose,
  category,
  etcCategories = [],
  month,
  totalAmount,
}: CategoryPopupProps) {
  const queryClient = useQueryClient();

  // 뒤로가기 버튼 처리
  const handleClose = useCallback(() => onClose(), [onClose]);
  useModalBackHandler({
    isOpen,
    onClose: handleClose,
    modalId: 'category-popup',
  });

  // EditModal 상태
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  // SimilarTransactionsModal 상태
  const [similarModalOpen, setSimilarModalOpen] = useState(false);
  const [changedTransaction, setChangedTransaction] = useState<Transaction | null>(null);
  const [newCategory, setNewCategory] = useState<Category | null>(null);
  const [newMerchantName, setNewMerchantName] = useState<string | null>(null);

  const isAll = category === '전체';
  const isEtc = category === 'etc.' && etcCategories.length > 0;

  // 거래 내역 조회
  // - '전체': 해당 월 전체 조회
  // - 'etc.': 전체 조회 후 필터링
  // - 그 외: 해당 카테고리만 조회
  const { data: transactionsData, isLoading } = useTransactions(
    {
      month,
      category: (isAll || isEtc) ? undefined : (category as Category | undefined),
    },
    { enabled: isOpen && !!category }
  );

  // etc.인 경우 해당 카테고리들만 필터링, 금액 내림차순 정렬
  const sortedTransactions = useMemo(() => {
    if (!transactionsData?.data) return [];

    let filtered: Transaction[];
    if (isEtc) {
      filtered = transactionsData.data.filter((tx) => etcCategories.includes(tx.category));
    } else {
      filtered = transactionsData.data;
    }

    return [...filtered].sort((a, b) => b.amount - a.amount);
  }, [transactionsData?.data, isEtc, etcCategories]);

  // 합계 계산 (totalAmount가 없는 경우)
  const displayTotal = useMemo(() => {
    if (totalAmount !== undefined) return totalAmount;
    return sortedTransactions.reduce((sum, tx) => sum + tx.amount, 0);
  }, [totalAmount, sortedTransactions]);

  // 거래 항목 클릭 - EditModal 열기
  const handleTransactionClick = useCallback((tx: Transaction) => {
    setSelectedTransaction(tx);
    setEditModalOpen(true);
  }, []);

  // 이용처 또는 카테고리 변경 후 비슷한 거래 찾기
  const handleFieldsChanged = useCallback((
    transaction: Transaction,
    changes: {
      merchant?: { old: string; new: string };
      category?: { old: Category; new: Category };
    }
  ) => {
    // 원래 값으로 transaction 복원
    const originalTx = { ...transaction };
    if (changes.merchant) {
      originalTx.merchant_name = changes.merchant.old;
    }
    if (changes.category) {
      originalTx.category = changes.category.old;
    }

    setChangedTransaction(originalTx);
    setNewMerchantName(changes.merchant?.new || null);
    setNewCategory(changes.category?.new || null);
    setSimilarModalOpen(true);
  }, []);

  // EditModal 닫힐 때 데이터 갱신
  const handleEditModalClose = useCallback((open: boolean) => {
    setEditModalOpen(open);
    if (!open) {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    }
  }, [queryClient]);

  if (!isOpen || !category) return null;

  const displayName = category;

  // EditModal 또는 SimilarTransactionsModal이 열려있으면 overlay 클릭 비활성화
  const isSubModalOpen = editModalOpen || similarModalOpen;

  return (
    <div
      className={`fixed inset-0 bg-black/50 flex items-center justify-center z-40 ${isSubModalOpen ? 'pointer-events-none' : ''}`}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-[90%] max-w-md max-h-[70vh] overflow-hidden shadow-xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 닫기 버튼 */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 z-10"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <h3 className="text-base font-bold text-slate-900 truncate">
              {displayName}
            </h3>
            <span className="text-xs text-slate-400 shrink-0">{formatYearMonth(month)}</span>
          </div>
          <span className="text-base font-bold text-slate-900 pr-6 shrink-0">
            {formatNumber(displayTotal)}원
          </span>
        </div>

        {/* 거래 목록 */}
        <div className="overflow-y-auto max-h-[calc(70vh-60px)]">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : sortedTransactions.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {sortedTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-slate-50 active:bg-slate-100 transition-colors"
                  onClick={() => handleTransactionClick(tx)}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {tx.merchant_name}
                    </p>
                    <p className="text-xs text-slate-400">
                      {formatShortDate(tx.transaction_date)}
                      {(isAll || isEtc) && <span className="ml-1 text-slate-300">· {tx.category}</span>}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-slate-900 shrink-0 ml-3">
                    {formatNumber(tx.amount)}원
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400">
              <p className="text-sm">거래 내역이 없습니다</p>
            </div>
          )}
        </div>
      </div>

      {/* 편집 모달 */}
      <EditModal
        open={editModalOpen}
        onOpenChange={handleEditModalClose}
        transaction={selectedTransaction}
        onFieldsChanged={handleFieldsChanged}
      />

      {/* 비슷한 거래 일괄 수정 모달 */}
      <SimilarTransactionsModal
        open={similarModalOpen}
        onOpenChange={setSimilarModalOpen}
        originalTransaction={changedTransaction}
        newCategory={newCategory}
        newMerchantName={newMerchantName}
      />
    </div>
  );
}
