'use client';

import { useState, useCallback, useEffect } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SearchFilters, PeriodType } from '@/types';
import { getActiveFilterCount } from '@/hooks/useSearchTransactions';

interface SearchBarProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  onOpenFilterPanel: () => void;
  className?: string;
}

export function SearchBar({
  filters,
  onFiltersChange,
  onOpenFilterPanel,
  className,
}: SearchBarProps) {
  const [searchInput, setSearchInput] = useState(filters.merchantSearch || '');
  const filterCount = getActiveFilterCount(filters);

  // 디바운스 처리
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filters.merchantSearch) {
        onFiltersChange({
          ...filters,
          merchantSearch: searchInput || undefined,
        });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput, filters, onFiltersChange]);

  // 외부에서 filters.merchantSearch가 변경될 때 동기화
  useEffect(() => {
    if (filters.merchantSearch !== searchInput) {
      setSearchInput(filters.merchantSearch || '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.merchantSearch]);

  const handlePeriodChange = useCallback(
    (periodType: PeriodType) => {
      onFiltersChange({
        ...filters,
        periodType,
        // custom 기간을 선택했을 때만 dateRange 유지
        dateRange: periodType === 'custom' ? filters.dateRange : undefined,
      });
    },
    [filters, onFiltersChange]
  );

  const handleClearSearch = useCallback(() => {
    setSearchInput('');
    onFiltersChange({
      ...filters,
      merchantSearch: undefined,
    });
  }, [filters, onFiltersChange]);

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* 기간 선택 드롭다운 */}
      <select
        value={filters.periodType}
        onChange={(e) => handlePeriodChange(e.target.value as PeriodType)}
        className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        <option value="current_month">현재 월</option>
        <option value="all">전체 기간</option>
        <option value="custom">기간 선택</option>
      </select>

      {/* 검색 입력 */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="이용처 검색..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-8 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        {searchInput && (
          <button
            onClick={handleClearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* 필터 버튼 */}
      <button
        onClick={onOpenFilterPanel}
        className={cn(
          'relative flex h-10 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors',
          filterCount > 0
            ? 'border-blue-500 bg-blue-50 text-blue-600'
            : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
        )}
      >
        <SlidersHorizontal className="h-4 w-4" />
        <span className="hidden sm:inline">필터</span>
        {filterCount > 0 && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-xs text-white">
            {filterCount}
          </span>
        )}
      </button>
    </div>
  );
}
