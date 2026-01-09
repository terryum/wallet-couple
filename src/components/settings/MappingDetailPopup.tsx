/**
 * 매핑 상세 팝업 컴포넌트
 * 카테고리/이용처명 매핑의 상세 정보 및 변경 히스토리 표시
 */

'use client';

import { useState } from 'react';
import { X, Clock, ChevronRight, RotateCcw, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CATEGORY_COLORS } from '@/components/transactions/TransactionRow';
import { formatDateTime } from '@/lib/utils/format';
import type { Category } from '@/types';

/** 카테고리 매핑 타입 */
export interface CategoryMapping {
  id: string;
  pattern: string;
  category: Category;
  source: 'ai' | 'manual';
  match_count: number;
  owner: 'husband' | 'wife' | null;
  created_at: string;
}

/** 이용처명 매핑 타입 */
export interface MerchantNameMapping {
  id: string;
  original_pattern: string;
  preferred_name: string;
  match_count: number;
  owner: 'husband' | 'wife' | null;
  created_at: string;
}

/** Action History 타입 */
export interface ActionHistory {
  id: string;
  action_type: string;
  entity_type: string;
  entity_id: string | null;
  description: string;
  previous_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  owner: string | null;
  created_at: string;
}

export type TabType = 'category' | 'merchant' | 'upload';

export interface MappingDetailPopupProps {
  isOpen: boolean;
  onClose: () => void;
  mapping: CategoryMapping | MerchantNameMapping | null;
  type: TabType;
  relatedHistory: ActionHistory[];
  isLoadingHistory: boolean;
  onRestore: (historyId: string) => Promise<void>;
  onDelete: () => void;
}

export function MappingDetailPopup({
  isOpen,
  onClose,
  mapping,
  type,
  relatedHistory,
  isLoadingHistory,
  onRestore,
  onDelete,
}: MappingDetailPopupProps) {
  const [restoringId, setRestoringId] = useState<string | null>(null);

  if (!isOpen || !mapping) return null;

  const isCategoryMapping = type === 'category';
  const categoryMapping = mapping as CategoryMapping;
  const merchantMapping = mapping as MerchantNameMapping;

  const handleRestore = async (historyId: string) => {
    setRestoringId(historyId);
    try {
      await onRestore(historyId);
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-[90%] max-w-md max-h-[80vh] overflow-hidden shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">매핑 상세</h3>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 매핑 정보 */}
        <div className="p-4 border-b border-slate-100">
          {isCategoryMapping ? (
            <div className="space-y-3">
              <div className="p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center justify-center gap-3">
                  <div className="flex-1 text-center">
                    <span className="text-xs text-slate-400 block mb-1">패턴</span>
                    <p className="text-sm font-bold text-slate-900">{categoryMapping.pattern}</p>
                  </div>
                  <div className="flex flex-col items-center px-2">
                    <span className="text-2xl text-[#3182F6]">→</span>
                  </div>
                  <div className="flex-1 text-center">
                    <span className="text-xs text-slate-400 block mb-1">카테고리</span>
                    <Badge className={`${CATEGORY_COLORS[categoryMapping.category] || CATEGORY_COLORS['기타']} text-sm`}>
                      {categoryMapping.category}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>
                  {categoryMapping.owner === 'husband' ? '남편' : categoryMapping.owner === 'wife' ? '아내' : '공통'}
                </span>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{formatDateTime(mapping.created_at)}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center justify-center gap-3">
                  <div className="flex-1 text-center">
                    <span className="text-xs text-slate-400 block mb-1">원본</span>
                    <p className="text-sm font-bold text-slate-900">{merchantMapping.original_pattern}</p>
                  </div>
                  <div className="flex flex-col items-center px-2">
                    <span className="text-2xl text-[#3182F6]">→</span>
                  </div>
                  <div className="flex-1 text-center">
                    <span className="text-xs text-slate-400 block mb-1">변환</span>
                    <p className="text-sm font-bold text-[#3182F6]">{merchantMapping.preferred_name}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>
                  {merchantMapping.owner === 'husband' ? '남편' : merchantMapping.owner === 'wife' ? '아내' : '공통'}
                </span>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{formatDateTime(mapping.created_at)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 변경 히스토리 */}
        <div className="p-4 max-h-[300px] overflow-y-auto">
          <h4 className="text-sm font-medium text-slate-900 mb-3">변경 히스토리</h4>

          {isLoadingHistory ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))}
            </div>
          ) : relatedHistory.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">변경 히스토리가 없습니다</p>
          ) : (
            <div className="space-y-2">
              {relatedHistory.map((history) => {
                const ownerLabel = history.owner === 'husband' ? '남편' : history.owner === 'wife' ? '아내' : null;
                const prevValue = isCategoryMapping
                  ? (history.previous_data as Record<string, unknown> | null)?.category as string | undefined
                  : (history.previous_data as Record<string, unknown> | null)?.preferred_name as string | undefined;
                const newValue = isCategoryMapping
                  ? (history.new_data as Record<string, unknown> | null)?.category as string | undefined
                  : (history.new_data as Record<string, unknown> | null)?.preferred_name as string | undefined;

                return (
                  <div
                    key={history.id}
                    className="p-3 bg-slate-50 rounded-xl"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                          {ownerLabel && (
                            <span className="px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded">
                              {ownerLabel}
                            </span>
                          )}
                          <span>{formatDateTime(history.created_at)}</span>
                        </div>
                        <p className="text-sm text-slate-700">{history.description}</p>
                        {prevValue && newValue && (
                          <div className="mt-2 p-2 bg-white rounded-lg border border-slate-100">
                            <div className="flex items-center gap-2 text-xs">
                              <div className="flex items-center gap-1">
                                <span className="text-slate-400">변경 전:</span>
                                <span className="text-red-500 font-medium">{prevValue}</span>
                              </div>
                              <ChevronRight className="w-3 h-3 text-slate-300" />
                              <div className="flex items-center gap-1">
                                <span className="text-slate-400">변경 후:</span>
                                <span className="text-green-600 font-medium">{newValue}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      {history.previous_data && (
                        <button
                          onClick={() => handleRestore(history.id)}
                          disabled={restoringId === history.id}
                          className="shrink-0 flex items-center gap-1 px-2 py-1 text-xs text-[#3182F6] hover:bg-[#3182F6]/10 rounded-lg disabled:opacity-50"
                        >
                          {restoringId === history.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <RotateCcw className="w-3.5 h-3.5" />
                          )}
                          복구
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 하단 삭제 버튼 */}
        <div className="p-4 border-t border-slate-100">
          <button
            onClick={onDelete}
            className="w-full py-2.5 text-sm font-medium text-red-500 bg-red-50 rounded-xl hover:bg-red-100"
          >
            매핑 삭제
          </button>
        </div>
      </div>
    </div>
  );
}
