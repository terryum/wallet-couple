/**
 * 패턴 매핑 관리 컴포넌트
 * 카테고리 및 이용처명 매핑을 확인하고 수정/삭제
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Trash2, Loader2, Tag, Store, Clock, RotateCcw, ChevronRight, FileUp, AlertTriangle, Search, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CATEGORY_COLORS } from '@/components/transactions/TransactionRow';
import { ALL_CATEGORIES, type Category } from '@/types';
import { formatDateTime, formatNumber } from '@/lib/utils/format';
import { useQueryClient } from '@tanstack/react-query';

/** 카테고리 매핑 타입 */
interface CategoryMapping {
  id: string;
  pattern: string;
  category: Category;
  source: 'ai' | 'manual';
  match_count: number;
  owner: 'husband' | 'wife' | null;
  created_at: string;
}

/** 이용처명 매핑 타입 */
interface MerchantNameMapping {
  id: string;
  original_pattern: string;
  preferred_name: string;
  match_count: number;
  owner: 'husband' | 'wife' | null;
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

/** 업로드된 파일 타입 */
interface UploadedFile {
  id: string;
  display_name: string;
  source_type: string;
  owner: string;
  billing_month: string | null;
  transaction_count: number;
  created_at: string;
}

type TabType = 'category' | 'merchant' | 'upload';

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
                <span>
                  {categoryMapping.source === 'manual'
                    ? categoryMapping.owner === 'husband'
                      ? '남편'
                      : categoryMapping.owner === 'wife'
                      ? '아내'
                      : '수동 설정'
                    : 'AI 분류'}
                </span>
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
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <span>
                  {merchantMapping.owner === 'husband'
                    ? '남편'
                    : merchantMapping.owner === 'wife'
                    ? '아내'
                    : '수동 설정'}
                </span>
                <span>{merchantMapping.match_count}회 적용</span>
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
                        {/* 누가 언제 */}
                        <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                          {ownerLabel && (
                            <span className="px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded">
                              {ownerLabel}
                            </span>
                          )}
                          <span>{formatDateTime(history.created_at)}</span>
                        </div>

                        {/* 변경 내용 설명 */}
                        <p className="text-sm text-slate-700">{history.description}</p>

                        {/* 변경 전/후 데이터 표시 */}
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
                );
              })}
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

// 소유자 필터 타입
type OwnerFilter = 'all' | 'husband' | 'wife';
// 거래 유형 필터 타입
type TransactionTypeFilter = 'all' | 'expense' | 'income';

export function MappingsManagement() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>('category');
  const [categoryMappings, setCategoryMappings] = useState<CategoryMapping[]>([]);
  const [merchantMappings, setMerchantMappings] = useState<MerchantNameMapping[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 필터 상태
  const [ownerFilter, setOwnerFilter] = useState<OwnerFilter>('all');
  const [transactionTypeFilter, setTransactionTypeFilter] = useState<TransactionTypeFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // 삭제 중 상태
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // 상세 팝업 상태
  const [selectedMapping, setSelectedMapping] = useState<CategoryMapping | MerchantNameMapping | null>(null);
  const [relatedHistory, setRelatedHistory] = useState<ActionHistory[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // 삭제 확인 팝업 상태
  const [confirmDeleteFile, setConfirmDeleteFile] = useState<UploadedFile | null>(null);

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

  // 업로드된 파일 조회
  const fetchUploadedFiles = useCallback(async () => {
    try {
      const res = await fetch('/api/files');
      const data = await res.json();

      if (data.success) {
        setUploadedFiles(data.data || []);
      }
    } catch (err) {
      console.error('파일 목록 조회 실패:', err);
    }
  }, []);

  // 파일 삭제 (롤백)
  const handleDeleteFile = async (file: UploadedFile) => {
    try {
      setDeletingId(file.id);
      const res = await fetch(`/api/files/${file.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (data.success) {
        // 확인 팝업 먼저 닫기
        setConfirmDeleteFile(null);
        // 파일 목록 다시 불러오기 (확실한 갱신)
        await fetchUploadedFiles();
        // 거래 내역 캐시 갱신
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
        queryClient.invalidateQueries({ queryKey: ['uploaded_files'] });
      } else {
        console.error('파일 삭제 실패:', data.error);
        alert(`삭제 실패: ${data.error || '알 수 없는 오류'}`);
        setConfirmDeleteFile(null);
      }
    } catch (err) {
      console.error('파일 삭제 실패:', err);
      alert('네트워크 오류가 발생했습니다.');
      setConfirmDeleteFile(null);
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    fetchMappings();
  }, [fetchMappings]);

  // 업로드 탭 선택 시 파일 목록 조회
  useEffect(() => {
    if (activeTab === 'upload') {
      fetchUploadedFiles();
    }
  }, [activeTab, fetchUploadedFiles]);

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

  // 매핑 클릭 핸들러 (상세 팝업)
  const handleMappingClick = (mapping: CategoryMapping | MerchantNameMapping) => {
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

  // 사용자가 직접 저장한 패턴만 필터링 (AI 분류 패턴 제외)
  // + 검색어 필터링
  const manualCategoryMappings = categoryMappings.filter((m) => {
    if (m.source !== 'manual') return false;
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      m.pattern.toLowerCase().includes(query) ||
      m.category.toLowerCase().includes(query)
    );
  });

  // 이용처명 매핑 검색 필터링
  const filteredMerchantMappings = merchantMappings.filter((m) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      m.original_pattern.toLowerCase().includes(query) ||
      m.preferred_name.toLowerCase().includes(query)
    );
  });

  const currentMappings = activeTab === 'category' ? manualCategoryMappings : filteredMerchantMappings;

  return (
    <div className="py-2">
      {/* 탭 + 필터 */}
      <div className="flex flex-col gap-3 mb-4">
        {/* 탭 버튼 */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('category')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              activeTab === 'category'
                ? 'bg-[#3182F6] text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Tag className="w-4 h-4" />
            카테고리 ({manualCategoryMappings.length})
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
            이용처명 ({filteredMerchantMappings.length})
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              activeTab === 'upload'
                ? 'bg-[#3182F6] text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <FileUp className="w-4 h-4" />
            업로드 ({uploadedFiles.length})
          </button>
        </div>

        {/* 필터 + 검색 */}
        {(activeTab === 'category' || activeTab === 'merchant') && (
          <div className="flex items-center gap-2">
            {/* 소유자 필터 - 카테고리 탭에서만 */}
            {activeTab === 'category' && (
              <div className="flex gap-1">
                {(['all', 'husband', 'wife'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setOwnerFilter(filter)}
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
            )}

            {/* 거래 유형 필터 - 카테고리 탭에서만 */}
            {activeTab === 'category' && (
              <div className="flex gap-1">
                {(['all', 'expense', 'income'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setTransactionTypeFilter(filter)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                      transactionTypeFilter === filter
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    {filter === 'all' ? '전체' : filter === 'expense' ? '지출' : '소득'}
                  </button>
                ))}
              </div>
            )}

            {/* 검색창 */}
            <div className="flex-1 flex justify-end">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-28 pl-7 pr-2 py-1 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-[#3182F6] focus:border-[#3182F6]"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 탭 콘텐츠 */}
      {activeTab === 'upload' ? (
        /* 업로드 파일 목록 */
        uploadedFiles.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <FileUp className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">업로드된 파일이 없습니다</p>
          </div>
        ) : (
          <div className="space-y-2">
            {uploadedFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl"
              >
                <FileUp className="w-5 h-5 text-slate-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {file.display_name}
                  </p>
                  <p className="text-xs text-slate-400">
                    {file.source_type} · {file.owner === 'husband' ? '남편' : '아내'} · {file.transaction_count}건 · {formatDateTime(file.created_at)}
                  </p>
                </div>
                <button
                  onClick={() => setConfirmDeleteFile(file)}
                  disabled={deletingId === file.id}
                  className="p-2 text-red-400 hover:text-red-600 hover:bg-red-100 rounded-lg disabled:opacity-50"
                >
                  {deletingId === file.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            ))}
          </div>
        )
      ) : currentMappings.length === 0 ? (
        <div className="py-12 text-center text-slate-400">
          <p className="text-sm">저장된 매핑이 없습니다</p>
        </div>
      ) : (
        <div className="space-y-2">
          {activeTab === 'category' ? (
            // 카테고리 매핑 목록 (사용자가 직접 저장한 패턴만)
            manualCategoryMappings.map((mapping) => (
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
                    {mapping.owner === 'husband' ? '남편' : mapping.owner === 'wife' ? '아내' : ''} · {mapping.match_count}회 적용
                  </p>
                </div>

                {/* 카테고리 뱃지 */}
                <Badge
                  className={`${CATEGORY_COLORS[mapping.category] || CATEGORY_COLORS['기타']} text-xs`}
                >
                  {mapping.category}
                </Badge>

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
            filteredMerchantMappings.map((mapping) => (
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
                    {mapping.owner === 'husband' ? '남편' : mapping.owner === 'wife' ? '아내' : ''} · {mapping.match_count}회 적용
                  </p>
                </div>

                {/* 화살표 */}
                <span className="text-slate-400 text-sm">→</span>

                {/* 변환된 이름 */}
                <span className="text-sm font-medium text-[#3182F6]">
                  {mapping.preferred_name}
                </span>

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
          : activeTab === 'merchant'
          ? '패턴이 포함된 이용처명은 자동으로 변환됩니다'
          : '파일을 삭제하면 해당 파일의 모든 거래 내역이 함께 삭제됩니다'}
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

      {/* 파일 삭제 확인 팝업 */}
      {confirmDeleteFile && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setConfirmDeleteFile(null)}>
          <div
            className="bg-white rounded-2xl w-[85%] max-w-sm p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">파일 삭제</h3>
                <p className="text-xs text-slate-500">이 작업은 되돌릴 수 없습니다</p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl mb-4">
              <p className="text-sm font-medium text-slate-900 truncate">
                {confirmDeleteFile.display_name}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {confirmDeleteFile.transaction_count}건의 거래 내역이 함께 삭제됩니다
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDeleteFile(null)}
                className="flex-1 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200"
              >
                취소
              </button>
              <button
                onClick={() => handleDeleteFile(confirmDeleteFile)}
                disabled={deletingId === confirmDeleteFile.id}
                className="flex-1 py-2.5 text-sm font-medium text-white bg-red-500 rounded-xl hover:bg-red-600 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deletingId === confirmDeleteFile.id ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    삭제 중...
                  </>
                ) : (
                  '삭제'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
