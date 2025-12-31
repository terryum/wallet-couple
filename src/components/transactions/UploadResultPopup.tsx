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
import type { Category, Transaction, TransactionType } from '@/types';
import { useQueryClient } from '@tanstack/react-query';

/** 2단계 팝업을 지원하는 소스 타입 (소득+지출 동시 처리) */
const DUAL_PHASE_SOURCES = ['우리은행', '한국투자증권'];

/** 현재 팝업 단계 */
type PopupPhase = 'expense' | 'income' | 'done';

interface UploadResultPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileId: string | null;
  displayName?: string;
  sourceType?: string;
}

export function UploadResultPopup({
  open,
  onOpenChange,
  fileId,
  displayName,
  sourceType,
}: UploadResultPopupProps) {
  const queryClient = useQueryClient();
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 2단계 팝업 관련 상태
  const [phase, setPhase] = useState<PopupPhase>('expense');
  const isDualPhase = DUAL_PHASE_SOURCES.includes(sourceType || '');

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

  // 자식 모달이 열려있는지 체크 (열려있으면 뒤로가기로 닫지 않음)
  const isChildModalOpen = editModalOpen || similarModalOpen;

  // 뒤로가기 버튼 처리 - 자식 모달이 없을 때만 닫기
  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  // 부모 팝업의 history state는 유지하되, 자식 모달이 열려있으면 back 핸들러만 비활성화
  // phase가 바뀌면 새로운 modalId를 사용하여 history state를 갱신
  useModalBackHandler({
    isOpen: open,
    onClose: handleClose,
    modalId: `upload-result-popup-${phase}`, // phase별 다른 modalId
    disabled: isChildModalOpen, // 자식 모달이 열려있으면 back 핸들링 비활성화
  });

  // 지출/소득 분리
  const expenseTransactions = allTransactions.filter(
    (t) => t.transaction_type !== 'income'
  );
  const incomeTransactions = allTransactions.filter(
    (t) => t.transaction_type === 'income'
  );

  // 현재 단계에서 보여줄 거래 목록
  const transactions = phase === 'income' ? incomeTransactions : expenseTransactions;

  // 현재 단계 제목
  const phaseTitle = isDualPhase
    ? phase === 'income'
      ? '업로드 내역 (소득)'
      : '업로드 내역 (지출)'
    : displayName || '업로드 내역';

  // 파일 ID로 거래 내역 조회 (재사용 가능한 함수)
  const fetchTransactions = useCallback(async (resetPhase = true) => {
    if (!fileId) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/transactions/by-file/${fileId}`);
      if (response.ok) {
        const data = await response.json();
        setAllTransactions(data.data || []);
        if (resetPhase) {
          setPhase('expense'); // 새로 열릴 때 지출 단계부터 시작
        }
      }
    } catch (error) {
      console.error('거래 내역 조회 실패:', error);
    } finally {
      setIsLoading(false);
    }
  }, [fileId]);

  // 팝업 열릴 때 데이터 조회
  useEffect(() => {
    if (!open || !fileId) {
      setAllTransactions([]);
      setPhase('expense'); // 팝업 닫힐 때 단계 초기화
      return;
    }

    fetchTransactions(true);
  }, [open, fileId, fetchTransactions]);

  // 거래 항목 클릭 시 EditModal 열기
  const handleTransactionClick = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setEditModalOpen(true);
  };

  // 거래 삭제 (Optimistic Update)
  const handleDelete = (transaction: Transaction) => {
    // 먼저 로컬 상태에서 즉시 제거 (Optimistic Update)
    setAllTransactions((prev) => prev.filter((t) => t.id !== transaction.id));

    // 그 다음 API 호출
    deleteTransaction(transaction.id, {
      onSuccess: () => {
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
    setAllTransactions((prev) =>
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

    // EditModal의 history.back()이 완료된 후에 SimilarTransactionsModal 열기
    // (history 이벤트 race condition 방지)
    setTimeout(() => {
      setChangedTransaction(originalTx);
      setNewMerchantName(changes.merchant?.new || null);
      setNewCategory(changes.category?.new || null);
      setSimilarModalOpen(true);
    }, 50);
  };

  // EditModal 닫힐 때 데이터 갱신
  const handleEditModalClose = (isOpen: boolean) => {
    setEditModalOpen(isOpen);
    if (!isOpen) {
      // 로컬 상태 새로고침 (삭제/수정 반영, phase 유지)
      fetchTransactions(false);
      // React Query 캐시도 무효화
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
              <FileSpreadsheet className={`w-5 h-5 ${phase === 'income' ? 'text-blue-600' : 'text-green-600'}`} />
              {phaseTitle}
            </DialogTitle>
            {!isLoading && transactions.length > 0 && (
              <p className="text-sm text-slate-500">
                {transactions.length}건 · 총 {formatNumber(totalAmount)}원
                {isDualPhase && phase === 'expense' && incomeTransactions.length > 0 && (
                  <span className="ml-2 text-blue-500">(소득 {incomeTransactions.length}건 대기)</span>
                )}
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
              onClick={() => {
                // 2단계 팝업 로직
                if (isDualPhase && phase === 'expense' && incomeTransactions.length > 0) {
                  // 지출 단계 완료 → 소득 단계로
                  setPhase('income');
                } else {
                  // 소득 단계 완료 또는 단일 단계 → 닫기
                  onOpenChange(false);
                }
              }}
              className={`w-full py-2.5 text-sm font-medium text-white rounded-xl transition-colors ${
                phase === 'income'
                  ? 'bg-blue-500 hover:bg-blue-600'
                  : 'bg-[#3182F6] hover:bg-[#1B64DA]'
              }`}
            >
              {isDualPhase && phase === 'expense' && incomeTransactions.length > 0
                ? '다음 (소득 내역)'
                : '확인'}
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
