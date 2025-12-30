/**
 * 변경 히스토리 모달 컴포넌트
 */

'use client';

import { useState } from 'react';
import { History, RotateCcw, Upload, Plus, Pencil, Trash2, Loader2, Eye } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useActionHistory, useUndoHistory } from '@/hooks/useHistory';
import { UploadResultPopup } from '@/components/transactions/UploadResultPopup';
import type { ActionHistory, ActionType } from '@/types';

interface HistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** 액션 타입별 아이콘 */
function ActionIcon({ type }: { type: ActionType }) {
  switch (type) {
    case 'create':
      return <Plus className="w-4 h-4 text-green-600" />;
    case 'update':
    case 'bulk_update':
      return <Pencil className="w-4 h-4 text-blue-600" />;
    case 'delete':
    case 'bulk_delete':
      return <Trash2 className="w-4 h-4 text-red-600" />;
    case 'upload':
      return <Upload className="w-4 h-4 text-purple-600" />;
    default:
      return <History className="w-4 h-4 text-slate-600" />;
  }
}

/** 액션 타입별 배경색 */
function getActionBgColor(type: ActionType): string {
  switch (type) {
    case 'create':
      return 'bg-green-100';
    case 'update':
    case 'bulk_update':
      return 'bg-blue-100';
    case 'delete':
    case 'bulk_delete':
      return 'bg-red-100';
    case 'upload':
      return 'bg-purple-100';
    default:
      return 'bg-slate-100';
  }
}

/** 시간 포맷 */
function formatTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return '방금 전';
  if (diffMins < 60) return `${diffMins}분 전`;
  if (diffHours < 24) return `${diffHours}시간 전`;
  if (diffDays < 7) return `${diffDays}일 전`;

  return date.toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function HistoryModal({ open, onOpenChange }: HistoryModalProps) {
  const { data: historyData, isLoading } = useActionHistory(10);
  const { mutate: undoHistory, isPending: isUndoing } = useUndoHistory();

  const [confirmUndoId, setConfirmUndoId] = useState<string | null>(null);
  const [confirmUndoDesc, setConfirmUndoDesc] = useState<string>('');

  // 업로드 내역 팝업 상태
  const [showUploadPopup, setShowUploadPopup] = useState(false);
  const [uploadFileId, setUploadFileId] = useState<string | null>(null);
  const [uploadDisplayName, setUploadDisplayName] = useState<string>('');

  const histories = historyData?.data || [];

  // 업로드 히스토리 클릭 핸들러
  const handleUploadClick = (history: ActionHistory) => {
    const fileId = history.entity_id || (history.new_data?.file_id as string);
    const displayName = (history.new_data?.display_name as string) || history.description;

    if (fileId) {
      setUploadFileId(fileId);
      setUploadDisplayName(displayName);
      setShowUploadPopup(true);
    }
  };

  const handleUndoClick = (history: ActionHistory) => {
    setConfirmUndoId(history.id);
    setConfirmUndoDesc(history.description);
  };

  const handleConfirmUndo = () => {
    if (!confirmUndoId) return;

    undoHistory(confirmUndoId, {
      onSuccess: () => {
        setConfirmUndoId(null);
        setConfirmUndoDesc('');
      },
    });
  };

  const handleCancelUndo = () => {
    setConfirmUndoId(null);
    setConfirmUndoDesc('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-md mx-auto rounded-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <History className="w-5 h-5" />
            변경 히스토리
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto -mx-6 px-6">
          {isLoading ? (
            <div className="space-y-3 py-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : histories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <History className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-sm">변경 히스토리가 없습니다</p>
            </div>
          ) : (
            <div className="space-y-2 py-2">
              {histories.map((history) => {
                const isUpload = history.action_type === 'upload' && history.entity_type === 'file';

                return (
                  <div
                    key={history.id}
                    className={`flex items-center gap-3 p-3 bg-slate-50 rounded-xl ${
                      isUpload ? 'cursor-pointer hover:bg-slate-100' : ''
                    }`}
                    onClick={isUpload ? () => handleUploadClick(history) : undefined}
                  >
                    {/* 아이콘 */}
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${getActionBgColor(history.action_type)}`}
                    >
                      <ActionIcon type={history.action_type} />
                    </div>

                    {/* 내용 */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {history.description}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatTime(history.created_at)}
                      </p>
                    </div>

                    {/* 보기 버튼 (업로드만) */}
                    {isUpload && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUploadClick(history);
                        }}
                        className="shrink-0 p-1.5 text-purple-500 hover:bg-purple-50 rounded-lg transition-colors"
                        title="내역 보기"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}

                    {/* 되돌리기 버튼 */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUndoClick(history);
                      }}
                      disabled={isUndoing}
                      className="shrink-0 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}

              {histories.length > 0 && (
                <p className="text-xs text-center text-slate-400 py-2">
                  최근 {histories.length}개의 변경 사항
                </p>
              )}
            </div>
          )}
        </div>

        {/* 되돌리기 확인 오버레이 */}
        {confirmUndoId && (
          <div className="absolute inset-0 bg-white/95 flex items-center justify-center p-6 rounded-2xl">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
                <RotateCcw className="w-8 h-8 text-amber-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                되돌리기
              </h3>
              <p className="text-sm text-slate-500 mb-6">
                &ldquo;{confirmUndoDesc}&rdquo; 변경 이전으로 되돌리시겠습니까?
                <br />
                <span className="text-amber-600 font-medium">
                  이 시점 이후의 모든 변경이 취소됩니다.
                </span>
              </p>

              <div className="flex gap-3">
                <button
                  onClick={handleCancelUndo}
                  disabled={isUndoing}
                  className="flex-1 py-3 text-sm font-medium text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleConfirmUndo}
                  disabled={isUndoing}
                  className="flex-1 py-3 text-sm font-medium text-white bg-amber-500 rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isUndoing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      처리 중...
                    </>
                  ) : (
                    '되돌리기'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>

      {/* 업로드 내역 팝업 */}
      <UploadResultPopup
        open={showUploadPopup}
        onOpenChange={setShowUploadPopup}
        fileId={uploadFileId}
        displayName={uploadDisplayName}
      />
    </Dialog>
  );
}
