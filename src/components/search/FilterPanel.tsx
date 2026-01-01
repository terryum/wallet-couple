'use client';

import { useState, useCallback } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import type { SearchFilters, Category, SourceType } from '@/types';
import {
  ALL_EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  ALL_SOURCE_TYPES,
} from '@/types';
import { DEFAULT_FILTERS } from '@/hooks/useSearchTransactions';

interface FilterPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: SearchFilters;
  onApply: (filters: SearchFilters) => void;
}

export function FilterPanel({
  open,
  onOpenChange,
  filters,
  onApply,
}: FilterPanelProps) {
  // 로컬 상태로 필터 관리 (적용 전까지 임시 저장)
  const [localFilters, setLocalFilters] = useState<SearchFilters>(filters);

  // 패널이 열릴 때 현재 필터로 초기화
  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (isOpen) {
        setLocalFilters(filters);
      }
      onOpenChange(isOpen);
    },
    [filters, onOpenChange]
  );

  // 카테고리 토글
  const toggleCategory = useCallback((category: Category) => {
    setLocalFilters((prev) => {
      const categories = prev.categories || [];
      const isSelected = categories.includes(category);

      return {
        ...prev,
        categories: isSelected
          ? categories.filter((c) => c !== category)
          : [...categories, category],
      };
    });
  }, []);

  // 결제수단 토글
  const toggleSourceType = useCallback((sourceType: SourceType) => {
    setLocalFilters((prev) => {
      const sourceTypes = prev.sourceTypes || [];
      const isSelected = sourceTypes.includes(sourceType);

      return {
        ...prev,
        sourceTypes: isSelected
          ? sourceTypes.filter((s) => s !== sourceType)
          : [...sourceTypes, sourceType],
      };
    });
  }, []);

  // 금액 범위 변경
  const handleAmountChange = useCallback(
    (field: 'min' | 'max', value: string) => {
      const numValue = value ? parseInt(value, 10) : undefined;
      setLocalFilters((prev) => ({
        ...prev,
        amountRange: {
          ...prev.amountRange,
          [field]: numValue,
        },
      }));
    },
    []
  );

  // 기간 변경
  const handleDateChange = useCallback(
    (field: 'startDate' | 'endDate', value: string) => {
      setLocalFilters((prev) => ({
        ...prev,
        periodType: 'custom',
        dateRange: {
          startDate: prev.dateRange?.startDate || '',
          endDate: prev.dateRange?.endDate || '',
          [field]: value,
        },
      }));
    },
    []
  );

  // 이용처 검색어 변경
  const handleMerchantSearchChange = useCallback((value: string) => {
    setLocalFilters((prev) => ({
      ...prev,
      merchantSearch: value || undefined,
    }));
  }, []);

  // 초기화
  const handleReset = useCallback(() => {
    setLocalFilters(DEFAULT_FILTERS);
  }, []);

  // 적용
  const handleApply = useCallback(() => {
    onApply(localFilters);
    onOpenChange(false);
  }, [localFilters, onApply, onOpenChange]);

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>검색 필터</SheetTitle>
        </SheetHeader>

        <div className="flex-1 space-y-6 overflow-y-auto px-4 py-2">
          {/* 기간 필터 */}
          <div>
            <h3 className="mb-2 text-sm font-medium text-gray-700">기간</h3>
            <div className="flex gap-2">
              <input
                type="date"
                value={localFilters.dateRange?.startDate || ''}
                onChange={(e) => handleDateChange('startDate', e.target.value)}
                className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <span className="flex items-center text-gray-400">~</span>
              <input
                type="date"
                value={localFilters.dateRange?.endDate || ''}
                onChange={(e) => handleDateChange('endDate', e.target.value)}
                className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* 이용처 검색 */}
          <div>
            <h3 className="mb-2 text-sm font-medium text-gray-700">
              이용처 포함 글자
            </h3>
            <input
              type="text"
              placeholder="이용처명에 포함된 글자"
              value={localFilters.merchantSearch || ''}
              onChange={(e) => handleMerchantSearchChange(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* 카테고리 필터 */}
          <div>
            <h3 className="mb-2 text-sm font-medium text-gray-700">
              카테고리 (복수 선택)
            </h3>
            <div className="space-y-2">
              <div className="text-xs text-gray-500">지출</div>
              <div className="flex flex-wrap gap-2">
                {ALL_EXPENSE_CATEGORIES.map((category) => (
                  <button
                    key={category}
                    onClick={() => toggleCategory(category)}
                    className={cn(
                      'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                      localFilters.categories?.includes(category)
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    )}
                  >
                    {category}
                  </button>
                ))}
              </div>
              <div className="mt-2 text-xs text-gray-500">소득</div>
              <div className="flex flex-wrap gap-2">
                {INCOME_CATEGORIES.map((category) => (
                  <button
                    key={category}
                    onClick={() => toggleCategory(category)}
                    className={cn(
                      'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                      localFilters.categories?.includes(category)
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    )}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 금액 범위 */}
          <div>
            <h3 className="mb-2 text-sm font-medium text-gray-700">금액 범위</h3>
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="최소"
                value={localFilters.amountRange?.min || ''}
                onChange={(e) => handleAmountChange('min', e.target.value)}
                className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <span className="text-gray-400">~</span>
              <input
                type="number"
                placeholder="최대"
                value={localFilters.amountRange?.max || ''}
                onChange={(e) => handleAmountChange('max', e.target.value)}
                className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-500">원</span>
            </div>
          </div>

          {/* 결제수단 필터 */}
          <div>
            <h3 className="mb-2 text-sm font-medium text-gray-700">
              결제수단 (복수 선택)
            </h3>
            <div className="flex flex-wrap gap-2">
              {ALL_SOURCE_TYPES.map((sourceType) => (
                <button
                  key={sourceType}
                  onClick={() => toggleSourceType(sourceType)}
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                    localFilters.sourceTypes?.includes(sourceType)
                      ? 'bg-purple-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  )}
                >
                  {sourceType}
                </button>
              ))}
            </div>
          </div>
        </div>

        <SheetFooter className="border-t pt-4">
          <div className="flex w-full gap-3">
            <button
              onClick={handleReset}
              className="flex-1 rounded-lg border border-gray-200 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              초기화
            </button>
            <button
              onClick={handleApply}
              className="flex-1 rounded-lg bg-blue-500 py-3 text-sm font-medium text-white hover:bg-blue-600"
            >
              적용하기
            </button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
