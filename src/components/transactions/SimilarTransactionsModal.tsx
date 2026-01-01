/**
 * 비슷한 거래 내역 일괄 수정 모달
 * 카테고리 또는 이용처명 변경 시 비슷한 거래를 일괄 수정
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Check, Loader2, AlertCircle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { CATEGORY_COLORS } from './TransactionRow';
import type { Transaction, Category } from '@/types';
import { formatCurrency, formatShortDate } from '@/lib/utils/format';
import { useModalBackHandler } from '@/hooks/useModalBackHandler';

// 변경 타입: 카테고리, 이용처명, 또는 둘 다
type ChangeType = 'category' | 'merchant' | 'both';

interface SimilarTransactionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  originalTransaction: Transaction | null;
  modalId?: string;
  // 카테고리 변경
  newCategory?: Category | null;
  // 이용처명 변경
  newMerchantName?: string | null;
  onBulkUpdated?: () => void;
}

export function SimilarTransactionsModal({
  open,
  onOpenChange,
  originalTransaction,
  modalId = 'similar-transactions-modal',
  newCategory,
  newMerchantName,
  onBulkUpdated,
}: SimilarTransactionsModalProps) {
  // 뒤로가기 버튼 처리
  const handleClose = useCallback(() => onOpenChange(false), [onOpenChange]);
  useModalBackHandler({
    isOpen: open,
    onClose: handleClose,
    modalId,
  });

  const queryClient = useQueryClient();
  const [similarTransactions, setSimilarTransactions] = useState<Transaction[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false); // 수정 완료 상태
  const [pattern, setPattern] = useState('');
  const [result, setResult] = useState<string | null>(null);

  // 변경 타입 결정
  const hasMerchantChange = !!newMerchantName;
  const hasCategoryChange = !!newCategory;
  const changeType: ChangeType = hasMerchantChange && hasCategoryChange
    ? 'both'
    : hasMerchantChange
      ? 'merchant'
      : 'category';
  const hasValidChange = hasMerchantChange || hasCategoryChange;

  // 비슷한 거래 조회
  useEffect(() => {
    if (!open || !originalTransaction || !hasValidChange) {
      setSimilarTransactions([]);
      setSelectedIds(new Set());
      setPattern('');
      setResult(null);
      setIsCompleted(false);
      return;
    }

    const fetchSimilar = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          merchant: originalTransaction.merchant_name,
          exclude_id: originalTransaction.id,
        });

        const res = await fetch(`/api/transactions/similar?${params}`);
        const data = await res.json();

        if (data.success && data.data.length > 0) {
          setSimilarTransactions(data.data);
          setSelectedIds(new Set(data.data.map((t: Transaction) => t.id)));
          setPattern(data.pattern);
        } else {
          onOpenChange(false);
        }
      } catch {
        onOpenChange(false);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSimilar();
  }, [open, originalTransaction, hasValidChange, changeType, newCategory, newMerchantName, onOpenChange]);

  // 선택 토글
  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // 항목 제거 (X 버튼)
  const removeItem = (id: string) => {
    setSimilarTransactions((prev) => prev.filter((t) => t.id !== id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  // 전체 선택/해제
  const toggleAll = () => {
    if (selectedIds.size === similarTransactions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(similarTransactions.map((t) => t.id)));
    }
  };

  // 일괄 수정
  const handleBulkUpdate = async () => {
    if (selectedIds.size === 0) return;

    setIsUpdating(true);
    try {
      const body: Record<string, unknown> = {
        ids: Array.from(selectedIds),
      };

      // 카테고리 변경
      if (hasCategoryChange && newCategory) {
        body.category = newCategory;
      }

      // 이용처명 변경
      if (hasMerchantChange && newMerchantName) {
        body.merchant_name = newMerchantName;
        // 이용처명 매핑도 저장
        body.save_mapping = true;
        body.original_merchant = originalTransaction?.merchant_name;
      }

      const res = await fetch('/api/transactions/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (data.success) {
        setResult(`${data.updated}건 수정 완료`);
        setIsCompleted(true);
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        queryClient.invalidateQueries({ queryKey: ['billing-comparison'] });
        onBulkUpdated?.();

        setTimeout(() => {
          onOpenChange(false);
        }, 1500);
      } else {
        setResult(`수정 실패: ${data.error}`);
      }
    } catch (error) {
      setResult(`오류: ${String(error)}`);
    } finally {
      setIsUpdating(false);
    }
  };

  if (!originalTransaction || !hasValidChange) return null;

  // UI 표시용 변수
  const titleText = changeType === 'both'
    ? '비슷한 거래 발견'
    : changeType === 'merchant'
      ? '비슷한 이용처 발견'
      : '비슷한 거래 발견';

  const descriptionText = changeType === 'both'
    ? `"${pattern}" 패턴과 일치하는 ${similarTransactions.length}건의 이용처와 카테고리를 함께 수정할까요?`
    : changeType === 'merchant'
      ? `"${pattern}" 패턴과 일치하는 ${similarTransactions.length}건의 이용처명을 "${newMerchantName}"으로 변경할까요?`
      : `"${pattern}" 패턴과 일치하는 ${similarTransactions.length}건의 거래를 "${newCategory}"으로 변경할까요?`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            {titleText}
            {hasMerchantChange && (
              <Badge className="bg-slate-100 text-slate-700 text-xs">
                {newMerchantName}
              </Badge>
            )}
            {hasCategoryChange && newCategory && (
              <Badge className={`${CATEGORY_COLORS[newCategory] || CATEGORY_COLORS['기타']} text-xs`}>
                {newCategory}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription className="text-left">{descriptionText}</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : (
          <>
            {/* 전체 선택 */}
            <div className="flex items-center justify-between px-1 py-2 border-b">
              <button
                onClick={toggleAll}
                className="text-sm text-[#3182F6] hover:text-[#1B64DA]"
              >
                {selectedIds.size === similarTransactions.length
                  ? '전체 해제'
                  : '전체 선택'}
              </button>
              <span className="text-sm text-slate-500">
                {selectedIds.size}건 선택됨
              </span>
            </div>

            {/* 거래 목록 */}
            <div className="flex-1 overflow-y-auto min-h-0 -mx-6 px-6">
              <div className="space-y-1 py-2">
                {similarTransactions.map((tx) => {
                  const isSelected = selectedIds.has(tx.id);
                  return (
                    <div
                      key={tx.id}
                      className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${
                        isSelected ? 'bg-blue-50' : 'bg-slate-50'
                      }`}
                    >
                      {/* 체크박스 */}
                      <button
                        onClick={() => toggleSelection(tx.id)}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-[#3182F6] border-[#3182F6] text-white'
                            : 'border-slate-300 hover:border-[#3182F6]'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                      </button>

                      {/* 거래 정보 */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {tx.merchant_name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatShortDate(tx.transaction_date)} · {formatCurrency(tx.amount)}
                        </p>
                      </div>

                      {/* 제거 버튼 */}
                      <button
                        onClick={() => removeItem(tx.id)}
                        className="p-1 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 shrink-0"
                        aria-label={`항목 제외: ${tx.merchant_name}`}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 결과 메시지 */}
            {result && (
              <div
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                  result.includes('실패') || result.includes('오류')
                    ? 'bg-red-50 text-red-700'
                    : 'bg-green-50 text-green-700'
                }`}
              >
                {result.includes('실패') || result.includes('오류') ? (
                  <AlertCircle className="w-4 h-4" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                {result}
              </div>
            )}

            {/* 버튼 영역 */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => onOpenChange(false)}
                disabled={isCompleted}
                className={`flex-1 py-2.5 text-sm font-medium rounded-xl transition-colors ${
                  isCompleted
                    ? 'text-slate-400 bg-slate-100 cursor-not-allowed'
                    : 'text-slate-600 bg-slate-100 hover:bg-slate-200'
                }`}
              >
                건너뛰기
              </button>
              <button
                onClick={handleBulkUpdate}
                disabled={selectedIds.size === 0 || isUpdating || isCompleted}
                className="flex-1 py-2.5 text-sm font-medium text-white bg-[#3182F6] rounded-xl hover:bg-[#1B64DA] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {isCompleted ? (
                  <>
                    <Check className="w-4 h-4" />
                    수정 완료
                  </>
                ) : isUpdating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    수정 중...
                  </>
                ) : (
                  `${selectedIds.size}건 일괄 수정`
                )}
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
