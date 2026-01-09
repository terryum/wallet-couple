/**
 * 매핑 필터 컴포넌트
 * 소유자 필터(전체/남편/아내) + 검색창
 */

'use client';

import { Search } from 'lucide-react';

export type OwnerFilter = 'all' | 'husband' | 'wife';

interface MappingFiltersProps {
  ownerFilter: OwnerFilter;
  onOwnerFilterChange: (filter: OwnerFilter) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
}

export function MappingFilters({
  ownerFilter,
  onOwnerFilterChange,
  searchQuery,
  onSearchQueryChange,
}: MappingFiltersProps) {
  return (
    <div className="flex items-center gap-2">
      {/* 소유자 필터 */}
      <div className="flex gap-1">
        {(['all', 'husband', 'wife'] as const).map((filter) => (
          <button
            key={filter}
            onClick={() => onOwnerFilterChange(filter)}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
              ownerFilter === filter
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            {filter === 'all' ? '전체' : filter === 'husband' ? '남편' : '아내'}
          </button>
        ))}
      </div>

      {/* 검색창 */}
      <div className="flex-1 flex justify-end">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="검색..."
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            className="w-28 pl-7 pr-2 py-1 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-[#3182F6] focus:border-[#3182F6]"
          />
        </div>
      </div>
    </div>
  );
}
