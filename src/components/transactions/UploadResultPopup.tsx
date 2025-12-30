/**
 * 업로드 결과 팝업 컴포넌트
 * 업로드된 거래 내역을 보여주고 클릭 시 EditModal로 편집
 * iOS 스타일 스와이프/롱프레스 삭제 지원
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { FileSpreadsheet } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatShortDate, formatNumber } from '@/lib/utils/format';
import { EditModal } from './EditModal';
import { SimilarTransactionsModal } from './SimilarTransactionsModal';
import { SwipeableRow } from './SwipeableRow';
import { CATEGORY_COLORS } from './TransactionRow';
import { useDeleteTransaction } from '@/hooks/useTransactions';
import { useModalBackHandler } from '@/hooks/useModalBackHandler';
import type { Category, Transaction } from '@/types';
import { useQueryClient } from '@tanstack/react-query';

interface UploadResultPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileId: string | null;
  displayName?: string;
}

export function UploadResultPopup({
  open,
  onOpenChange,
  fileId,
  displayName,
}: UploadResultPopupProps) {
  // 뒤로가기 버튼 처리
  const handleClose = useCallback(() => onOpenChange(false), [onOpenChange]);
  useModalBackHandler({
    isOpen: open,
    onClose: handleClose,
    modalId: 'upload-result-popup',
  });

  const queryClient = useQueryClient();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 삭제 뮤테이션
  const { mutate: deleteTransaction } = useDeleteTransaction();

  // EditModal 상태
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  // SimilarTransactionsModal 상태
  const [similarModalOpen, setSimilarModalOpen] = useState(false);
  const [changedTransaction, setChangedTransaction] = useState<Transaction | null>(null);
  const [newCategory, setNewCategory] = useState<Category | null>(null);
  const [newMerchantName, setNewMerchantName] = useState<string | null>(null);

  // 파일 ID로 거래 내역 조회
  useEffect(() => {
    if (!open || !fileId) {
      setTransactions([]);
      return;
    }

    const fetchTransactions = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/transactions/by-file/${fileId}`);
        if (response.ok) {
          const data = await response.json();
          setTransactions(data.data || []);
        }
      } catch (error) {
        console.error('거래 내역 조회 실패:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTransactions();
  }, [open, fileId]);

  // 거래 항목 클릭 시 EditModal 열기
  const handleTransactionClick = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setEditModalOpen(true);
  };

  // 거래 삭제
  const handleDelete = (transaction: Transaction) => {
    deleteTransaction(transaction.id, {
      onSuccess: () => {
        // 로컬 상태에서 제거
        setTransactions((prev) => prev.filter((t) => t.id !== transaction.id));
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
      },
    });
  };

  // 이용처 또는 카테고리 변경 후 비슷한 거래 찾기
  const handleFieldsChanged = (
    transaction: Transaction,
    changes: {
      merchant?: { old: string; new: string };
      category?: { old: Category; new: Category };
    }
  ) => {
    // 로컬 상태 업데이트
    setTransactions((prev) =>
      prev.map((t) => {
        if (t.id !== transaction.id) return t;
        const updated = { ...t };
        if (changes.merchant) updated.merchant_name = changes.merchant.new;
        if (changes.category) updated.category = changes.category.new;
        return updated;
      })
    );

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
  };

  // EditModal 닫힐 때 데이터 갱신
  const handleEditModalClose = (isOpen: boolean) => {
    setEditModalOpen(isOpen);
    if (!isOpen) {
      // 데이터 새로고침
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    }
  };

  const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-lg mx-auto rounded-2xl max-h-[85vh] !flex !flex-col overflow-hidden p-0">
          <DialogHeader className="shrink-0 p-6 pb-2">
            <DialogTitle className="text-lg font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-green-600" />
              {displayName || '업로드 내역'}
            </DialogTitle>
            {!isLoading && transactions.length > 0 && (
              <p className="text-sm text-slate-500">
                {transactions.length}건 · 총 {formatNumber(totalAmount)}원
              </p>
            )}
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto px-6">
            {isLoading ? (
              <div className="space-y-2 py-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-xl" />
                ))}
              </div>
            ) : transactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <FileSpreadsheet className="w-12 h-12 mb-3 opacity-50" />
                <p className="text-sm">거래 내역이 없습니다</p>
              </div>
            ) : (
              <div className="space-y-1 py-2">
                {transactions.map((transaction) => (
                  <SwipeableRow
                    key={transaction.id}
                    onDelete={() => handleDelete(transaction)}
                    onClick={() => handleTransactionClick(transaction)}
                  >
                    <div className="flex items-center gap-2 p-3 cursor-pointer">
                      {/* 날짜 */}
                      <span className="text-xs text-slate-400 shrink-0 w-10">
                        {formatShortDate(transaction.transaction_date)}
                      </span>

                      {/* 이용처 */}
                      <span className="flex-1 text-sm text-slate-900 truncate font-medium">
                        {transaction.merchant_name}
                      </span>

                      {/* 카테고리 */}
                      <Badge
                        variant="secondary"
                        className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-md font-medium ${
                          CATEGORY_COLORS[transaction.category] || CATEGORY_COLORS['기타']
                        }`}
                      >
                        {transaction.category}
                      </Badge>

                      {/* 금액 */}
                      <span className="text-sm font-bold tracking-tight text-slate-900 text-right shrink-0 w-16">
                        {formatNumber(transaction.amount)}
                      </span>
                    </div>
                  </SwipeableRow>
                ))}
              </div>
            )}
          </div>

          {/* 하단 안내 */}
          {!isLoading && transactions.length > 0 && (
            <p className="text-xs text-center text-slate-400 py-2 shrink-0">
              탭하여 편집 · 길게 눌러 삭제 · 왼쪽으로 스와이프
            </p>
          )}

          {/* 하단 버튼 */}
          <div className="shrink-0 p-6 pt-2 border-t border-slate-100">
            <button
              onClick={() => onOpenChange(false)}
              className="w-full py-2.5 text-sm font-medium text-white bg-[#3182F6] rounded-xl hover:bg-[#1B64DA] transition-colors"
            >
              확인
            </button>
          </div>
        </DialogContent>
      </Dialog>

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
    </>
  );
}
