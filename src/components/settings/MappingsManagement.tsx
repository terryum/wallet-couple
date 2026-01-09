/**
 * 패턴 매핑 관리 컴포넌트
 * 카테고리 및 이용처명 매핑을 확인하고 수정/삭제
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Trash2, Loader2, Tag, Store, FileUp, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useQueryClient } from '@tanstack/react-query';
import { formatDateTime } from '@/lib/utils/format';
import {
  MappingDetailPopup,
  type CategoryMapping,
  type MerchantNameMapping,
  type ActionHistory,
  type TabType,
} from './MappingDetailPopup';
import { MappingListItem } from './MappingListItem';
import { MappingFilters, type OwnerFilter } from './MappingFilters';

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
    } catch {
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
      const res = await fetch(`/api/files/${file.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setConfirmDeleteFile(null);
        await fetchUploadedFiles();
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
        queryClient.invalidateQueries({ queryKey: ['uploaded_files'] });
      } else {
        alert(`삭제 실패: ${data.error || '알 수 없는 오류'}`);
        setConfirmDeleteFile(null);
      }
    } catch {
      alert('네트워크 오류가 발생했습니다.');
      setConfirmDeleteFile(null);
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    fetchMappings();
  }, [fetchMappings]);

  useEffect(() => {
    if (activeTab === 'upload') {
      fetchUploadedFiles();
    }
  }, [activeTab, fetchUploadedFiles]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchMappings();
      }
    };
    const handleMappingChange = () => fetchMappings();

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
      setRelatedHistory(data.success ? data.data || [] : []);
    } catch {
      setRelatedHistory([]);
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  // 매핑 삭제
  const handleDelete = async (type: TabType, id: string) => {
    if (!confirm('매핑을 삭제하시겠습니까?\n\n이 매핑으로 변경된 거래들이 원래 값으로 복구됩니다.')) {
      return;
    }
    try {
      setDeletingId(id);
      const res = await fetch(`/api/mappings?type=${type}&id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        if (type === 'category') {
          setCategoryMappings((prev) => prev.filter((m) => m.id !== id));
        } else {
          setMerchantMappings((prev) => prev.filter((m) => m.id !== id));
        }
        setSelectedMapping(null);
        if (data.restored > 0) {
          alert(`${data.restored}건의 거래가 복구되었습니다.`);
        }
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      } else {
        alert(`삭제 실패: ${data.error}`);
      }
    } catch {
      alert('삭제 중 오류가 발생했습니다.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleMappingClick = (mapping: CategoryMapping | MerchantNameMapping) => {
    setSelectedMapping(mapping);
    fetchMappingHistory(mapping.id, activeTab);
  };

  const handleRestore = async (historyId: string) => {
    try {
      const res = await fetch('/api/mappings/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ historyId }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchMappings();
        setSelectedMapping(null);
        window.dispatchEvent(new CustomEvent('mapping-changed'));
      }
    } catch (err) {
      console.error('복구 실패:', err);
    }
  };

  const handleClosePopup = () => {
    setSelectedMapping(null);
    setRelatedHistory([]);
  };

  // 로딩 상태
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

  // 에러 상태
  if (error) {
    return (
      <div className="py-8 text-center text-red-500">
        <p>{error}</p>
        <button onClick={fetchMappings} className="mt-2 text-sm text-[#3182F6] hover:underline">
          다시 시도
        </button>
      </div>
    );
  }

  // 필터링 로직 (ownerFilter 적용)
  const manualCategoryMappings = categoryMappings
    .filter((m) => {
      if (m.source !== 'manual') return false;
      if (ownerFilter !== 'all' && m.owner !== ownerFilter) return false;
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return m.pattern.toLowerCase().includes(query) || m.category.toLowerCase().includes(query);
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const filteredMerchantMappings = merchantMappings
    .filter((m) => {
      if (ownerFilter !== 'all' && m.owner !== ownerFilter) return false;
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return m.original_pattern.toLowerCase().includes(query) || m.preferred_name.toLowerCase().includes(query);
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div className="py-2">
      {/* 탭 + 필터 */}
      <div className="flex flex-col gap-3 mb-4">
        {/* 탭 버튼 */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('category')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              activeTab === 'category' ? 'bg-[#3182F6] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Tag className="w-4 h-4" />
            카테고리 ({manualCategoryMappings.length})
          </button>
          <button
            onClick={() => setActiveTab('merchant')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              activeTab === 'merchant' ? 'bg-[#3182F6] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Store className="w-4 h-4" />
            이용처명 ({filteredMerchantMappings.length})
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              activeTab === 'upload' ? 'bg-[#3182F6] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <FileUp className="w-4 h-4" />
            업로드 ({uploadedFiles.length})
          </button>
        </div>

        {/* 필터 + 검색 (카테고리/이용처명 탭 모두) */}
        {activeTab !== 'upload' && (
          <MappingFilters
            ownerFilter={ownerFilter}
            onOwnerFilterChange={setOwnerFilter}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
          />
        )}
      </div>

      {/* 탭 콘텐츠 */}
      {activeTab === 'upload' ? (
        uploadedFiles.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <FileUp className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">업로드된 파일이 없습니다</p>
          </div>
        ) : (
          <div className="space-y-2">
            {uploadedFiles.map((file) => (
              <div key={file.id} className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl">
                <FileUp className="w-5 h-5 text-slate-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{file.display_name}</p>
                  <p className="text-xs text-slate-400">
                    {file.source_type} · {file.owner === 'husband' ? '남편' : '아내'} · {file.transaction_count}건 · {formatDateTime(file.created_at)}
                  </p>
                </div>
                <button
                  onClick={() => setConfirmDeleteFile(file)}
                  disabled={deletingId === file.id}
                  className="p-2 text-red-400 hover:text-red-600 hover:bg-red-100 rounded-lg disabled:opacity-50"
                >
                  {deletingId === file.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
              </div>
            ))}
          </div>
        )
      ) : activeTab === 'category' && manualCategoryMappings.length === 0 ? (
        <div className="py-12 text-center text-slate-400">
          <p className="text-sm">저장된 매핑이 없습니다</p>
        </div>
      ) : activeTab === 'merchant' && filteredMerchantMappings.length === 0 ? (
        <div className="py-12 text-center text-slate-400">
          <p className="text-sm">저장된 매핑이 없습니다</p>
        </div>
      ) : (
        <div className="space-y-2">
          {activeTab === 'category'
            ? manualCategoryMappings.map((mapping) => (
                <MappingListItem
                  key={mapping.id}
                  mapping={mapping}
                  type="category"
                  isDeleting={deletingId === mapping.id}
                  onClick={() => handleMappingClick(mapping)}
                  onDelete={() => handleDelete('category', mapping.id)}
                />
              ))
            : filteredMerchantMappings.map((mapping) => (
                <MappingListItem
                  key={mapping.id}
                  mapping={mapping}
                  type="merchant"
                  isDeleting={deletingId === mapping.id}
                  onClick={() => handleMappingClick(mapping)}
                  onDelete={() => handleDelete('merchant', mapping.id)}
                />
              ))}
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
          <div className="bg-white rounded-2xl w-[85%] max-w-sm p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
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
              <p className="text-sm font-medium text-slate-900 truncate">{confirmDeleteFile.display_name}</p>
              <p className="text-xs text-slate-500 mt-1">{confirmDeleteFile.transaction_count}건의 거래 내역이 함께 삭제됩니다</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDeleteFile(null)} className="flex-1 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200">
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
