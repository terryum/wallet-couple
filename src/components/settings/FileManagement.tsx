/**
 * 업로드 파일 관리 컴포넌트
 * 월별로 그룹화하여 드롭다운 형태로 표시
 */

'use client';

import { useState, useMemo } from 'react';
import { Trash2, Loader2, FileSpreadsheet, Upload, Download, PenLine, ChevronDown, ChevronRight } from 'lucide-react';
import { useUploadedFiles, useDeleteFile, useManualEntryCounts } from '@/hooks/useFiles';
import { formatDateTime } from '@/lib/utils/format';
import { ResetConfirmDialog } from './ResetConfirmDialog';

interface UploadedFile {
  id: string;
  display_name: string;
  billing_month: string | null;
  transaction_count: number;
  created_at: string;
}

/** 파일명에서 "남편_현대카드" 부분만 추출 */
function getShortFileName(displayName: string): string {
  // "2025년_12월_남편_현대카드.xls" -> "남편_현대카드"
  const match = displayName.match(/^\d+년_\d+월_(.+)\.\w+$/);
  if (match) {
    return match[1];
  }
  // 매칭 안되면 원본 반환
  return displayName;
}

/** 파일들을 billing_month별로 그룹화 */
function groupFilesByMonth(files: UploadedFile[]): Map<string, UploadedFile[]> {
  const groups = new Map<string, UploadedFile[]>();

  for (const file of files) {
    const month = file.billing_month || 'unknown';
    if (!groups.has(month)) {
      groups.set(month, []);
    }
    groups.get(month)!.push(file);
  }

  // 월별로 정렬 (최신 순)
  const sortedGroups = new Map(
    [...groups.entries()].sort((a, b) => b[0].localeCompare(a[0]))
  );

  return sortedGroups;
}

/** billing_month를 "2025년 12월 명세서" 형태로 변환 */
function formatBillingMonth(month: string): string {
  if (month === 'unknown') return '기타 명세서';
  const [year, m] = month.split('-');
  return `${year}년 ${parseInt(m, 10)}월 명세서`;
}

interface FileManagementProps {
  onUploadClick?: () => void;
}

export function FileManagement({ onUploadClick }: FileManagementProps) {
  const { data: files, isLoading: isLoadingFiles } = useUploadedFiles();
  const { data: manualCounts, isLoading: isLoadingManual } = useManualEntryCounts();
  const { mutate: deleteFile, isPending: isDeleting } = useDeleteFile();

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());

  // 파일을 월별로 그룹화
  const groupedFiles = useMemo(() => {
    if (!files) return new Map<string, UploadedFile[]>();
    return groupFilesByMonth(files as UploadedFile[]);
  }, [files]);

  const toggleMonth = (month: string) => {
    setExpandedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(month)) {
        next.delete(month);
      } else {
        next.add(month);
      }
      return next;
    });
  };

  const handleDownloadFile = async (fileId: string, displayName: string) => {
    try {
      setDownloadingId(fileId);
      const response = await fetch(`/api/files/${fileId}/download`);

      if (!response.ok) {
        throw new Error('다운로드 실패');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = displayName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download error:', error);
      alert('파일 다운로드에 실패했습니다.');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadManualEntry = async (owner: 'husband' | 'wife') => {
    const id = `manual-${owner}`;
    try {
      setDownloadingId(id);
      const response = await fetch(`/api/manual-entries/${owner}`);

      if (!response.ok) {
        throw new Error('다운로드 실패');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = owner === 'husband' ? '남편_직접입력.xlsx' : '아내_직접입력.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download error:', error);
      alert('파일 다운로드에 실패했습니다.');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDeleteFile = (fileId: string) => {
    deleteFile(fileId, {
      onSuccess: () => {
        setDeleteConfirmId(null);
      },
    });
  };

  const isLoading = isLoadingFiles || isLoadingManual;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  const hasUploadedFiles = files && files.length > 0;

  return (
    <div className="space-y-4">
      {/* 직접입력 파일 섹션 */}
      <div className="space-y-2">
        <p className="text-xs text-slate-500 font-medium px-1">직접입력 내역</p>

        {/* 남편 직접입력 */}
        <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
          <button
            onClick={() => handleDownloadManualEntry('husband')}
            disabled={downloadingId === 'manual-husband'}
            className="flex items-center gap-3 flex-1 min-w-0 text-left hover:bg-blue-100 -m-2 p-2 rounded-lg transition-colors"
          >
            {downloadingId === 'manual-husband' ? (
              <Loader2 className="w-5 h-5 text-slate-400 animate-spin shrink-0" />
            ) : (
              <PenLine className="w-5 h-5 text-blue-600 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">
                남편_직접입력.xlsx
              </p>
              <p className="text-xs text-slate-500">
                {manualCounts?.husband || 0}건
              </p>
            </div>
            <Download className="w-4 h-4 text-slate-400 shrink-0" />
          </button>
        </div>

        {/* 아내 직접입력 */}
        <div className="flex items-center gap-3 p-3 bg-pink-50 rounded-xl">
          <button
            onClick={() => handleDownloadManualEntry('wife')}
            disabled={downloadingId === 'manual-wife'}
            className="flex items-center gap-3 flex-1 min-w-0 text-left hover:bg-pink-100 -m-2 p-2 rounded-lg transition-colors"
          >
            {downloadingId === 'manual-wife' ? (
              <Loader2 className="w-5 h-5 text-slate-400 animate-spin shrink-0" />
            ) : (
              <PenLine className="w-5 h-5 text-pink-600 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">
                아내_직접입력.xlsx
              </p>
              <p className="text-xs text-slate-500">
                {manualCounts?.wife || 0}건
              </p>
            </div>
            <Download className="w-4 h-4 text-slate-400 shrink-0" />
          </button>
        </div>
      </div>

      {/* 업로드된 파일 섹션 - 월별 드롭다운 */}
      {hasUploadedFiles && (
        <div className="space-y-2 pt-2">
          <p className="text-xs text-slate-500 font-medium px-1">업로드된 명세서</p>

          {Array.from(groupedFiles.entries()).map(([month, monthFiles]) => {
            const isExpanded = expandedMonths.has(month);
            const totalCount = monthFiles.reduce((sum, f) => sum + f.transaction_count, 0);

            return (
              <div key={month} className="bg-slate-50 rounded-xl overflow-hidden">
                {/* 월별 헤더 (드롭다운 버튼) */}
                <button
                  onClick={() => toggleMonth(month)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-slate-100 transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                  )}
                  <FileSpreadsheet className="w-5 h-5 text-green-600 shrink-0" />
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-slate-900">
                      {formatBillingMonth(month)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {monthFiles.length}개 파일 · {totalCount}건
                    </p>
                  </div>
                </button>

                {/* 확장된 파일 목록 */}
                {isExpanded && (
                  <div className="border-t border-slate-100">
                    {monthFiles.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center gap-3 px-3 py-2 pl-10 hover:bg-slate-100 transition-colors"
                      >
                        <button
                          onClick={() => handleDownloadFile(file.id, file.display_name)}
                          disabled={downloadingId === file.id}
                          className="flex items-center gap-3 flex-1 min-w-0 text-left"
                        >
                          {downloadingId === file.id ? (
                            <Loader2 className="w-4 h-4 text-slate-400 animate-spin shrink-0" />
                          ) : (
                            <Download className="w-4 h-4 text-slate-400 shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-slate-700 truncate">
                              {getShortFileName(file.display_name)}
                            </p>
                            <p className="text-xs text-slate-400">
                              {file.transaction_count}건 · {formatDateTime(file.created_at)}
                            </p>
                          </div>
                        </button>

                        {deleteConfirmId === file.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="px-2 py-1 text-xs text-slate-500 hover:text-slate-700"
                              disabled={isDeleting}
                            >
                              취소
                            </button>
                            <button
                              onClick={() => handleDeleteFile(file.id)}
                              disabled={isDeleting}
                              className="px-2 py-1 text-xs text-white bg-red-500 rounded-lg hover:bg-red-600 disabled:opacity-50"
                            >
                              {isDeleting ? '삭제 중...' : '확인'}
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirmId(file.id)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 빈 상태 메시지 (업로드된 파일이 없을 때만) */}
      {!hasUploadedFiles && (
        <div className="text-center py-6">
          <p className="text-slate-400 text-xs">업로드된 명세서가 없습니다</p>
        </div>
      )}

      {/* 하단 버튼들 */}
      <div className="pt-4 border-t border-slate-100">
        <div className="flex gap-3">
          {onUploadClick && (
            <button
              onClick={onUploadClick}
              className="flex-1 py-2.5 text-sm font-medium text-white bg-[#3182F6] hover:bg-[#1B64DA] rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <Upload className="w-4 h-4" />
              파일 업로드
            </button>
          )}
          <button
            onClick={() => setResetDialogOpen(true)}
            className="flex-1 py-2.5 text-sm font-medium text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors border border-red-200"
          >
            전체 초기화
          </button>
        </div>
      </div>

      {/* 공유 초기화 다이얼로그 */}
      <ResetConfirmDialog
        open={resetDialogOpen}
        onOpenChange={setResetDialogOpen}
      />
    </div>
  );
}
