/**
 * 패턴 매핑 관리 컴포넌트
 * 카테고리 및 이용처명 매핑을 확인하고 수정/삭제
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Trash2, Edit2, Check, X, Loader2, Tag, Store, Clock, RotateCcw, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CATEGORY_COLORS } from '@/components/transactions/TransactionRow';
import { ALL_CATEGORIES, type Category } from '@/types';
import { formatDateTime } from '@/lib/utils/format';

/** 카테고리 매핑 타입 */
interface CategoryMapping {
  id: string;
  pattern: string;
  category: Category;
  source: 'ai' | 'manual';
  match_count: number;
  created_at: string;
}

/** 이용처명 매핑 타입 */
interface MerchantNameMapping {
  id: string;
  original_pattern: string;
  preferred_name: string;
  match_count: number;
  created_at: string;
}

/** Action History 타입 */
interface ActionHistory {
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

type TabType = 'category' | 'merchant';

/** 매핑 상세 팝업 Props */
interface MappingDetailPopupProps {
  isOpen: boolean;
  onClose: () => void;
  mapping: CategoryMapping | MerchantNameMapping | null;
  type: TabType;
  relatedHistory: ActionHistory[];
  isLoadingHistory: boolean;
  onRestore: (historyId: string) => Promise<void>;
  onDelete: () => void;
}

/** 매핑 상세 팝업 */
function MappingDetailPopup({
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
              <div>
                <span className="text-xs text-slate-400">패턴</span>
                <p className="text-sm font-medium text-slate-900">{categoryMapping.pattern}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">카테고리</span>
                <Badge className={`${CATEGORY_COLORS[categoryMapping.category] || CATEGORY_COLORS['기타']} text-xs`}>
                  {categoryMapping.category}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <span>{categoryMapping.source === 'manual' ? '수동 설정' : 'AI 분류'}</span>
                <span>{categoryMapping.match_count}회 적용</span>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <span className="text-xs text-slate-400">원본 패턴</span>
                <p className="text-sm font-medium text-slate-900">{merchantMapping.original_pattern}</p>
              </div>
              <div>
                <span className="text-xs text-slate-400">변환 이름</span>
                <p className="text-sm font-medium text-[#3182F6]">{merchantMapping.preferred_name}</p>
              </div>
              <div className="text-xs text-slate-500">
                {merchantMapping.match_count}회 적용
              </div>
            </div>
          )}

          {/* 생성 시간 */}
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-400">
            <Clock className="w-3.5 h-3.5" />
            <span>매핑 생성: {formatDateTime(mapping.created_at)}</span>
          </div>
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
              {relatedHistory.map((history) => (
                <div
                  key={history.id}
                  className="p-3 bg-slate-50 rounded-xl"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-700">{history.description}</p>
                      <p className="text-xs text-slate-400 mt-1">
                        {formatDateTime(history.created_at)}
                      </p>

                      {/* 이전/이후 데이터 표시 */}
                      {history.previous_data && history.new_data && (
                        <div className="mt-2 text-xs">
                          <div className="flex items-center gap-1 text-slate-500">
                            <span className="text-red-400 line-through">
                              {isCategoryMapping
                                ? (history.previous_data as Record<string, unknown>).category as string
                                : (history.previous_data as Record<string, unknown>).preferred_name as string
                              }
                            </span>
                            <ChevronRight className="w-3 h-3" />
                            <span className="text-green-600">
                              {isCategoryMapping
                                ? (history.new_data as Record<string, unknown>).category as string
                                : (history.new_data as Record<string, unknown>).preferred_name as string
                              }
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 복구 버튼 */}
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
              ))}
            </div>
          )}
        </div>

        {/* 하단 버튼 */}
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

export function MappingsManagement() {
  const [activeTab, setActiveTab] = useState<TabType>('category');
  const [categoryMappings, setCategoryMappings] = useState<CategoryMapping[]>([]);
  const [merchantMappings, setMerchantMappings] = useState<MerchantNameMapping[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 편집 상태
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  // 삭제 중 상태
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // 상세 팝업 상태
  const [selectedMapping, setSelectedMapping] = useState<CategoryMapping | MerchantNameMapping | null>(null);
  const [relatedHistory, setRelatedHistory] = useState<ActionHistory[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // 매핑 조회
  const fetchMappings = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const res = await fetch('/api/mappings');
      const data = await res.json();

      if (data.success) {
        setCategoryMappings(data.data.categoryMappings || []);
        setMerchantMappings(data.data.merchantMappings || []);
      } else {
        setError(data.error || '매핑을 불러오는데 실패했습니다.');
      }
    } catch (err) {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMappings();
  }, [fetchMappings]);

  // 컴포넌트가 visible 될 때마다 refetch (설정 메뉴에서 열릴 때)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchMappings();
      }
    };

    // 커스텀 이벤트로 매핑 변경 감지
    const handleMappingChange = () => {
      fetchMappings();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('mapping-changed', handleMappingChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('mapping-changed', handleMappingChange);
    };
  }, [fetchMappings]);

  // 매핑 관련 히스토리 조회
  const fetchMappingHistory = useCallback(async (mappingId: string, mappingType: TabType) => {
    try {
      setIsLoadingHistory(true);
      const res = await fetch(`/api/mappings/history?mappingId=${mappingId}&type=${mappingType}`);
      const data = await res.json();

      if (data.success) {
        setRelatedHistory(data.data || []);
      } else {
        setRelatedHistory([]);
      }
    } catch (err) {
      setRelatedHistory([]);
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  // 매핑 삭제
  const handleDelete = async (type: TabType, id: string) => {
    try {
      setDeletingId(id);
      const res = await fetch(`/api/mappings?type=${type}&id=${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (data.success) {
        if (type === 'category') {
          setCategoryMappings((prev) => prev.filter((m) => m.id !== id));
        } else {
          setMerchantMappings((prev) => prev.filter((m) => m.id !== id));
        }
        // 팝업 닫기
        setSelectedMapping(null);
      }
    } catch (err) {
      console.error('삭제 실패:', err);
    } finally {
      setDeletingId(null);
    }
  };

  // 편집 시작
  const startEdit = (id: string, currentValue: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(id);
    setEditValue(currentValue);
  };

  // 편집 취소
  const cancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
    setEditValue('');
  };

  // 카테고리 매핑 저장
  const saveCategoryEdit = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch('/api/mappings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'category',
          id,
          category: editValue,
        }),
      });
      const data = await res.json();

      if (data.success) {
        setCategoryMappings((prev) =>
          prev.map((m) => (m.id === id ? { ...m, category: editValue as Category, source: 'manual' } : m))
        );
        setEditingId(null);
        setEditValue('');
        // 매핑 변경 이벤트 발생
        window.dispatchEvent(new CustomEvent('mapping-changed'));
      }
    } catch (err) {
      console.error('저장 실패:', err);
    }
  };

  // 이용처명 매핑 저장
  const saveMerchantEdit = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch('/api/mappings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'merchant',
          id,
          preferredName: editValue,
        }),
      });
      const data = await res.json();

      if (data.success) {
        setMerchantMappings((prev) =>
          prev.map((m) => (m.id === id ? { ...m, preferred_name: editValue } : m))
        );
        setEditingId(null);
        setEditValue('');
        // 매핑 변경 이벤트 발생
        window.dispatchEvent(new CustomEvent('mapping-changed'));
      }
    } catch (err) {
      console.error('저장 실패:', err);
    }
  };

  // 매핑 클릭 핸들러 (상세 팝업)
  const handleMappingClick = (mapping: CategoryMapping | MerchantNameMapping) => {
    if (editingId) return; // 편집 중이면 무시
    setSelectedMapping(mapping);
    fetchMappingHistory(mapping.id, activeTab);
  };

  // 히스토리에서 복구
  const handleRestore = async (historyId: string) => {
    try {
      const res = await fetch('/api/mappings/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ historyId }),
      });
      const data = await res.json();

      if (data.success) {
        // 매핑 목록 새로고침
        await fetchMappings();
        // 팝업 닫기
        setSelectedMapping(null);
        // 매핑 변경 이벤트 발생
        window.dispatchEvent(new CustomEvent('mapping-changed'));
      }
    } catch (err) {
      console.error('복구 실패:', err);
    }
  };

  // 팝업 닫기
  const handleClosePopup = () => {
    setSelectedMapping(null);
    setRelatedHistory([]);
  };

  if (isLoading) {
    return (
      <div className="space-y-3 py-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
            <Skeleton className="w-20 h-5 rounded" />
            <Skeleton className="flex-1 h-5 rounded" />
            <Skeleton className="w-8 h-8 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8 text-center text-red-500">
        <p>{error}</p>
        <button
          onClick={fetchMappings}
          className="mt-2 text-sm text-[#3182F6] hover:underline"
        >
          다시 시도
        </button>
      </div>
    );
  }

  const currentMappings = activeTab === 'category' ? categoryMappings : merchantMappings;

  return (
    <div className="py-2">
      {/* 탭 */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab('category')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            activeTab === 'category'
              ? 'bg-[#3182F6] text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Tag className="w-4 h-4" />
          카테고리 ({categoryMappings.length})
        </button>
        <button
          onClick={() => setActiveTab('merchant')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            activeTab === 'merchant'
              ? 'bg-[#3182F6] text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Store className="w-4 h-4" />
          이용처명 ({merchantMappings.length})
        </button>
      </div>

      {/* 매핑 목록 */}
      {currentMappings.length === 0 ? (
        <div className="py-12 text-center text-slate-400">
          <p className="text-sm">저장된 매핑이 없습니다</p>
        </div>
      ) : (
        <div className="space-y-2">
          {activeTab === 'category' ? (
            // 카테고리 매핑 목록
            categoryMappings.map((mapping) => (
              <div
                key={mapping.id}
                className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => handleMappingClick(mapping)}
              >
                {/* 패턴 */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {mapping.pattern}
                  </p>
                  <p className="text-xs text-slate-400">
                    {mapping.source === 'manual' ? '수동' : 'AI'} · {mapping.match_count}회 · {formatDateTime(mapping.created_at)}
                  </p>
                </div>

                {/* 카테고리 (편집 가능) */}
                {editingId === mapping.id ? (
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="text-xs px-2 py-1 rounded-lg border border-slate-200 bg-white"
                    >
                      {ALL_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={(e) => saveCategoryEdit(mapping.id, e)}
                      className="p-1.5 text-green-600 hover:bg-green-100 rounded-lg"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="p-1.5 text-slate-400 hover:bg-slate-200 rounded-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <Badge
                      className={`${CATEGORY_COLORS[mapping.category] || CATEGORY_COLORS['기타']} text-xs cursor-pointer`}
                      onClick={(e) => startEdit(mapping.id, mapping.category, e)}
                    >
                      {mapping.category}
                    </Badge>
                    <button
                      onClick={(e) => startEdit(mapping.id, mapping.category, e)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </>
                )}

                {/* 삭제 버튼 */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete('category', mapping.id);
                  }}
                  disabled={deletingId === mapping.id}
                  className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-100 rounded-lg disabled:opacity-50"
                >
                  {deletingId === mapping.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            ))
          ) : (
            // 이용처명 매핑 목록
            merchantMappings.map((mapping) => (
              <div
                key={mapping.id}
                className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => handleMappingClick(mapping)}
              >
                {/* 원본 패턴 */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {mapping.original_pattern}
                  </p>
                  <p className="text-xs text-slate-400">
                    {mapping.match_count}회 · {formatDateTime(mapping.created_at)}
                  </p>
                </div>

                {/* 화살표 */}
                <span className="text-slate-400 text-sm">→</span>

                {/* 변환된 이름 (편집 가능) */}
                {editingId === mapping.id ? (
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="text-sm px-2 py-1 rounded-lg border border-slate-200 w-32"
                    />
                    <button
                      onClick={(e) => saveMerchantEdit(mapping.id, e)}
                      className="p-1.5 text-green-600 hover:bg-green-100 rounded-lg"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="p-1.5 text-slate-400 hover:bg-slate-200 rounded-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <span
                      className="text-sm font-medium text-[#3182F6] cursor-pointer hover:underline"
                      onClick={(e) => startEdit(mapping.id, mapping.preferred_name, e)}
                    >
                      {mapping.preferred_name}
                    </span>
                    <button
                      onClick={(e) => startEdit(mapping.id, mapping.preferred_name, e)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </>
                )}

                {/* 삭제 버튼 */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete('merchant', mapping.id);
                  }}
                  disabled={deletingId === mapping.id}
                  className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-100 rounded-lg disabled:opacity-50"
                >
                  {deletingId === mapping.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* 안내 문구 */}
      <p className="mt-4 text-xs text-slate-400 text-center">
        {activeTab === 'category'
          ? '패턴이 포함된 이용처는 자동으로 해당 카테고리로 분류됩니다'
          : '패턴이 포함된 이용처명은 자동으로 변환됩니다'}
      </p>

      {/* 매핑 상세 팝업 */}
      <MappingDetailPopup
        isOpen={!!selectedMapping}
        onClose={handleClosePopup}
        mapping={selectedMapping}
        type={activeTab}
        relatedHistory={relatedHistory}
        isLoadingHistory={isLoadingHistory}
        onRestore={handleRestore}
        onDelete={() => selectedMapping && handleDelete(activeTab, selectedMapping.id)}
      />
    </div>
  );
}
