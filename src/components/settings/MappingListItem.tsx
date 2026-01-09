/**
 * 매핑 목록 아이템 컴포넌트
 * 카테고리/이용처명 매핑 모두 지원하는 공용 컴포넌트
 */

'use client';

import { Trash2, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { CATEGORY_COLORS } from '@/components/transactions/TransactionRow';
import { formatDateTime } from '@/lib/utils/format';
import type { CategoryMapping, MerchantNameMapping } from './MappingDetailPopup';

export type MappingType = 'category' | 'merchant';

interface MappingListItemProps {
  mapping: CategoryMapping | MerchantNameMapping;
  type: MappingType;
  isDeleting: boolean;
  onClick: () => void;
  onDelete: () => void;
}

export function MappingListItem({
  mapping,
  type,
  isDeleting,
  onClick,
  onDelete,
}: MappingListItemProps) {
  const ownerLabel = mapping.owner === 'husband' ? '남편 · ' : mapping.owner === 'wife' ? '아내 · ' : '';

  if (type === 'category') {
    const categoryMapping = mapping as CategoryMapping;
    return (
      <div
        className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors"
        onClick={onClick}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium text-slate-900 truncate">
              {categoryMapping.pattern}
            </span>
            <span className="text-slate-400">→</span>
            <Badge
              className={`${CATEGORY_COLORS[categoryMapping.category] || CATEGORY_COLORS['기타']} text-xs shrink-0`}
            >
              {categoryMapping.category}
            </Badge>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {ownerLabel}{formatDateTime(mapping.created_at)}
          </p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          disabled={isDeleting}
          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-100 rounded-lg disabled:opacity-50"
        >
          {isDeleting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4" />
          )}
        </button>
      </div>
    );
  }

  // 이용처명 매핑
  const merchantMapping = mapping as MerchantNameMapping;
  return (
    <div
      className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors"
      onClick={onClick}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-slate-900 truncate">
            {merchantMapping.original_pattern}
          </span>
          <span className="text-slate-400">→</span>
          <span className="text-sm font-medium text-[#3182F6] truncate">
            {merchantMapping.preferred_name}
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-0.5">
          {ownerLabel}{formatDateTime(mapping.created_at)}
        </p>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        disabled={isDeleting}
        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-100 rounded-lg disabled:opacity-50"
      >
        {isDeleting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Trash2 className="w-4 h-4" />
        )}
      </button>
    </div>
  );
}
