/**
 * 거래 내역 편집/삭제/추가 모달 컴포넌트
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ALL_EXPENSE_CATEGORIES, INCOME_CATEGORIES, type Category, type Transaction, type Owner } from '@/types';
import { CATEGORY_COLORS } from './TransactionRow';
import {
  useUpdateTransaction,
  useDeleteTransaction,
  useCreateTransaction,
} from '@/hooks/useTransactions';
import { useModalBackHandler } from '@/hooks/useModalBackHandler';

interface EditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction | null;
  modalId?: string;
  /** 새 거래 추가 시 사용할 owner (transaction이 null일 때 필요) */
  owner?: Owner;
  /** 이용처 또는 카테고리 변경 시 콜백 (둘 다 변경되면 함께 전달) */
  onFieldsChanged?: (
    transaction: Transaction,
    changes: {
      merchant?: { old: string; new: string };
      category?: { old: Category; new: Category };
    }
  ) => void;
}

export function EditModal({
  open,
  onOpenChange,
  transaction,
  modalId = 'edit-modal',
  owner,
  onFieldsChanged,
}: EditModalProps) {
  // 뒤로가기 버튼 처리
  const handleClose = useCallback(() => onOpenChange(false), [onOpenChange]);
  useModalBackHandler({
    isOpen: open,
    onClose: handleClose,
    modalId,
  });

  // 생성 모드 여부
  const isCreateMode = !transaction;

  const [formData, setFormData] = useState({
    transaction_date: '',
    merchant_name: '',
    amount: '',
    category: '기타' as Category,
    memo: '',
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { mutate: updateTransaction, isPending: isUpdating } =
    useUpdateTransaction();
  const { mutate: deleteTransaction, isPending: isDeleting } =
    useDeleteTransaction();
  const { mutate: createTransaction, isPending: isCreating } =
    useCreateTransaction();

  const isPending = isUpdating || isDeleting || isCreating;

  // transaction이 변경될 때 폼 데이터 초기화
  useEffect(() => {
    if (transaction) {
      // 편집 모드: 기존 데이터로 초기화
      setFormData({
        transaction_date: transaction.transaction_date,
        merchant_name: transaction.merchant_name,
        amount: String(transaction.amount),
        category: transaction.category,
        memo: transaction.memo || '',
      });
    } else {
      // 생성 모드: 빈 폼으로 초기화 (오늘 날짜 기본값)
      const today = new Date().toISOString().split('T')[0];
      setFormData({
        transaction_date: today,
        merchant_name: '',
        amount: '',
        category: '기타',
        memo: '',
      });
    }
    setShowDeleteConfirm(false);
  }, [transaction, open]);

  // 변경사항 확인 (편집 모드에서만 의미 있음)
  const hasChanges =
    transaction &&
    (formData.transaction_date !== transaction.transaction_date ||
      formData.merchant_name !== transaction.merchant_name ||
      formData.amount !== String(transaction.amount) ||
      formData.category !== transaction.category ||
      formData.memo !== (transaction.memo || ''));

  // 생성 모드에서 필수 필드 입력 확인
  const canCreate =
    isCreateMode &&
    formData.transaction_date &&
    formData.merchant_name &&
    formData.amount &&
    Number(formData.amount) > 0;

  // 이용처 변경 여부
  const hasMerchantChanged =
    transaction && formData.merchant_name !== transaction.merchant_name;

  // 카테고리 변경 여부
  const hasCategoryChanged =
    transaction && formData.category !== transaction.category;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isCreateMode) {
      // 생성 모드
      if (!canCreate || !owner) return;

      createTransaction(
        {
          transaction_date: formData.transaction_date,
          merchant_name: formData.merchant_name,
          amount: Number(formData.amount),
          category: formData.category,
          memo: formData.memo || undefined,
          source_type: '기타',
          owner: owner,
        },
        {
          onSuccess: () => {
            onOpenChange(false);
          },
        }
      );
    } else {
      // 편집 모드
      if (!transaction || !hasChanges) return;

      const oldMerchantName = transaction.merchant_name;
      const newMerchantName = formData.merchant_name;
      const oldCategory = transaction.category;
      const newCategory = formData.category;
      const txCopy = { ...transaction }; // 트랜잭션 복사본

      updateTransaction(
        {
          id: transaction.id,
          data: {
            transaction_date: formData.transaction_date,
            merchant_name: formData.merchant_name,
            amount: Number(formData.amount),
            category: formData.category,
            memo: formData.memo || undefined,
          },
        },
        {
          onSuccess: () => {
            onOpenChange(false);

            // 이용처 또는 카테고리 변경 시 콜백 호출 (둘 다 가능)
            if ((hasMerchantChanged || hasCategoryChanged) && onFieldsChanged) {
              const changes: {
                merchant?: { old: string; new: string };
                category?: { old: Category; new: Category };
              } = {};

              if (hasMerchantChanged) {
                changes.merchant = { old: oldMerchantName, new: newMerchantName };
              }
              if (hasCategoryChanged) {
                changes.category = { old: oldCategory, new: newCategory };
              }

              onFieldsChanged(txCopy, changes);
            }
          },
        }
      );
    }
  };

  const handleDelete = () => {
    if (!transaction) return;

    deleteTransaction(transaction.id, {
      onSuccess: () => {
        onOpenChange(false);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-md mx-auto rounded-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold tracking-tight text-slate-900">
            {isCreateMode ? '내역 추가' : '상세 내역'}
          </DialogTitle>
          <DialogDescription className="sr-only">
            거래 내역을 추가하거나 수정 및 삭제합니다.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 날짜 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              날짜
            </label>
            <Input
              type="date"
              value={formData.transaction_date}
              onChange={(e) =>
                setFormData({ ...formData, transaction_date: e.target.value })
              }
              disabled={isPending}
              className="rounded-xl"
            />
          </div>

          {/* 이용처 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              이용처
            </label>
            <Input
              value={formData.merchant_name}
              onChange={(e) =>
                setFormData({ ...formData, merchant_name: e.target.value })
              }
              disabled={isPending}
              className="rounded-xl"
            />
          </div>

          {/* 금액 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              금액
            </label>
            <Input
              type="number"
              value={formData.amount}
              onChange={(e) =>
                setFormData({ ...formData, amount: e.target.value })
              }
              disabled={isPending}
              className="rounded-xl"
            />
          </div>

          {/* 카테고리 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              카테고리
              {transaction?.transaction_type === 'income' && (
                <span className="ml-2 text-xs text-blue-500 font-normal">(소득)</span>
              )}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {(transaction?.transaction_type === 'income' ? INCOME_CATEGORIES : ALL_EXPENSE_CATEGORIES).map((category) => {
                const colorClass =
                  CATEGORY_COLORS[category] || CATEGORY_COLORS['기타'];
                const isSelected = formData.category === category;

                return (
                  <Badge
                    key={category}
                    variant="secondary"
                    className={`cursor-pointer text-xs ${colorClass} ${
                      isSelected ? 'ring-2 ring-[#3182F6]' : ''
                    } ${isPending ? 'opacity-50 pointer-events-none' : ''}`}
                    onClick={() =>
                      setFormData({ ...formData, category })
                    }
                  >
                    {category}
                  </Badge>
                );
              })}
            </div>
          </div>

          {/* 메모 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              메모
            </label>
            <Input
              value={formData.memo}
              onChange={(e) =>
                setFormData({ ...formData, memo: e.target.value })
              }
              placeholder="메모 입력..."
              disabled={isPending}
              className="rounded-xl"
            />
          </div>

          {/* 버튼 그룹 */}
          <div className="flex gap-2 pt-4">
            {isCreateMode ? (
              // 생성 모드: 추가 버튼만 표시
              <button
                type="submit"
                disabled={!canCreate || isPending}
                className="flex-1 py-2.5 text-sm font-medium text-white bg-[#3182F6] rounded-xl hover:bg-[#1B64DA] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating ? '추가 중...' : '추가하기'}
              </button>
            ) : showDeleteConfirm ? (
              <div className="w-full bg-red-50 rounded-xl p-4">
                <p className="text-sm font-medium text-red-700 text-center mb-3">
                  정말 삭제하시겠습니까?
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 py-2.5 text-sm font-medium text-slate-700 bg-white rounded-xl hover:bg-slate-100 border border-slate-200"
                    disabled={isPending}
                  >
                    아니오
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="flex-1 py-2.5 text-sm font-medium text-white bg-red-500 rounded-xl hover:bg-red-600 disabled:opacity-50"
                    disabled={isPending}
                  >
                    {isDeleting ? '삭제 중...' : '예'}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-4 py-2.5 text-sm font-medium text-red-500 hover:text-red-600"
                  disabled={isPending}
                >
                  삭제하기
                </button>
                <button
                  type="submit"
                  disabled={!hasChanges || isPending}
                  className="flex-1 py-2.5 text-sm font-medium text-white bg-[#3182F6] rounded-xl hover:bg-[#1B64DA] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUpdating ? '수정 중...' : '수정 완료'}
                </button>
              </>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
