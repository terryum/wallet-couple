/**
 * 카테고리 선택 바텀시트 컴포넌트
 */

'use client';

import { useState, useCallback } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ALL_CATEGORIES, type Category, type Transaction } from '@/types';
import { CATEGORY_COLORS } from './TransactionRow';
import { useUpdateTransaction } from '@/hooks/useTransactions';
import { useModalBackHandler } from '@/hooks/useModalBackHandler';

/** 수동 카테고리 매핑 저장 */
async function saveMapping(merchantName: string, category: Category): Promise<void> {
  try {
    await fetch('/api/mappings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ merchantName, category }),
    });
  } catch (error) {
    console.error('매핑 저장 실패:', error);
  }
}

interface CategorySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction | null;
  onCategoryChanged?: (transaction: Transaction, oldCategory: Category, newCategory: Category) => void;
}

export function CategorySheet({
  open,
  onOpenChange,
  transaction,
  onCategoryChanged,
}: CategorySheetProps) {
  // 뒤로가기 버튼 처리
  const handleClose = useCallback(() => onOpenChange(false), [onOpenChange]);
  useModalBackHandler({
    isOpen: open,
    onClose: handleClose,
    modalId: 'category-sheet',
  });

  const [customInput, setCustomInput] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const { mutate: updateTransaction, isPending } = useUpdateTransaction();

  const handleCategorySelect = (category: Category) => {
    if (!transaction) return;
    if (category === transaction.category) {
      onOpenChange(false);
      return;
    }

    const oldCategory = transaction.category;
    const txCopy = { ...transaction };

    updateTransaction(
      { id: transaction.id, data: { category } },
      {
        onSuccess: () => {
          onOpenChange(false);
          saveMapping(txCopy.merchant_name, category);
          if (onCategoryChanged) {
            onCategoryChanged(txCopy, oldCategory, category);
          }
        },
      }
    );
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transaction || !customInput.trim()) return;

    // 입력값이 기존 카테고리와 일치하는지 확인
    const matchedCategory = ALL_CATEGORIES.find(
      (c) => c === customInput.trim()
    );

    if (matchedCategory) {
      handleCategorySelect(matchedCategory);
    } else {
      // 기타로 저장하고 메모에 사용자 입력 추가
      const oldCategory = transaction.category;
      const txCopy = { ...transaction };

      updateTransaction(
        {
          id: transaction.id,
          data: {
            category: '기타',
            memo: `[${customInput.trim()}] ${transaction.memo || ''}`.trim(),
          },
        },
        {
          onSuccess: () => {
            // 수동 카테고리 매핑 저장
            saveMapping(txCopy.merchant_name, '기타');

            setCustomInput('');
            setShowCustomInput(false);
            onOpenChange(false);

            // 비슷한 거래 찾기 콜백 호출
            if (onCategoryChanged) {
              onCategoryChanged(txCopy, oldCategory, '기타');
            }
          },
        }
      );
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl">
        <SheetHeader className="pb-2">
          <SheetTitle>카테고리 변경</SheetTitle>
          {transaction && (
            <p className="text-sm text-gray-500 truncate">
              {transaction.merchant_name}
            </p>
          )}
        </SheetHeader>

        <div className="px-4 pb-8">
          {/* 카테고리 그리드 */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {ALL_CATEGORIES.map((category) => {
              const colorClass =
                CATEGORY_COLORS[category] || CATEGORY_COLORS['기타'];
              const isSelected = transaction?.category === category;

              return (
                <Badge
                  key={category}
                  variant="secondary"
                  className={`py-2 justify-center cursor-pointer text-sm transition-all ${colorClass} ${
                    isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''
                  } ${isPending ? 'opacity-50 pointer-events-none' : ''}`}
                  onClick={() => handleCategorySelect(category)}
                >
                  {category}
                </Badge>
              );
            })}
          </div>

          {/* 직접 입력 */}
          {showCustomInput ? (
            <form onSubmit={handleCustomSubmit} className="flex gap-2">
              <Input
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                placeholder="카테고리 입력..."
                className="flex-1"
                autoFocus
                disabled={isPending}
              />
              <button
                type="submit"
                disabled={isPending || !customInput.trim()}
                className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                적용
              </button>
            </form>
          ) : (
            <button
              onClick={() => setShowCustomInput(true)}
              className="w-full py-2.5 text-sm text-gray-500 border border-dashed border-gray-300 rounded-lg hover:bg-gray-50"
            >
              직접 입력
            </button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
