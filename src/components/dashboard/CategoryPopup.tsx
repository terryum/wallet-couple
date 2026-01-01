/**
 * 카테고리 상세 팝업 - PieChartCard, StackedBarCard 공유
 * category가 '전체'인 경우 해당 월의 모든 거래 내역 표시
 * 거래 항목 클릭 시 EditModal로 수정 가능
 */

'use client';

import { useMemo, useCallback, useId } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatNumber, formatYearMonth, formatShortDate } from '@/lib/utils/format';
import { useTransactions } from '@/hooks/useTransactions';
import { useTransactionEditFlow } from '@/hooks/useTransactionEditFlow';
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

  const editFlow = useTransactionEditFlow({
    onEditClose: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    modalIdBase: 'category-popup',
  });

  const isAll = category === '전체';
  const isEtc = category === 'etc.' && etcCategories.length > 0;
  const titleId = useId();
  const descriptionId = useId();

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
  const handleTransactionClick = useCallback(
    (tx: Transaction) => {
      editFlow.openEdit(tx);
    },
    [editFlow]
  );

  if (!isOpen || !category) return null;

  const displayName = category;

  // EditModal 또는 SimilarTransactionsModal이 열려있으면 overlay 클릭 비활성화
  const isSubModalOpen = editFlow.isSubModalOpen;

  // 뒤로가기 버튼 처리
  const handleClose = useCallback(() => onClose(), [onClose]);
  useModalBackHandler({
    isOpen,
    onClose: handleClose,
    modalId: 'category-popup',
    disabled: isSubModalOpen,
  });

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen && !isSubModalOpen) {
        onClose();
      }
    },
    [isSubModalOpen, onClose]
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className="w-[90%] max-w-md max-h-[70vh] overflow-hidden p-0"
        showCloseButton={!isSubModalOpen}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <DialogHeader className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <DialogTitle id={titleId} className="text-base font-bold text-slate-900 truncate">
              {displayName}
            </DialogTitle>
            <span className="text-xs text-slate-400 shrink-0">{formatYearMonth(month)}</span>
          </div>
          <DialogDescription id={descriptionId} className="sr-only">
            선택한 카테고리의 거래 내역을 확인하고 편집합니다.
          </DialogDescription>
          <span className="text-base font-bold text-slate-900 pr-6 shrink-0">
            {formatNumber(displayTotal)}원
          </span>
        </DialogHeader>

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
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      handleTransactionClick(tx);
                    }
                  }}
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
      </DialogContent>

      {/* 편집 모달 */}
      <EditModal
        {...editFlow.editModalProps}
      />

      {/* 비슷한 거래 일괄 수정 모달 */}
      {editFlow.similarModalProps && (
        <SimilarTransactionsModal {...editFlow.similarModalProps} />
      )}
    </Dialog>
  );
}
