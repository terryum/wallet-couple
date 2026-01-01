/**
 * 전체 초기화 확인 다이얼로그
 * FileManagement와 SettingsDropdown에서 공유하여 사용
 */

'use client';

import { useCallback, useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useResetAllData } from '@/hooks/useFiles';
import { useModalBackHandler } from '@/hooks/useModalBackHandler';

interface ResetConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ResetConfirmDialog({ open, onOpenChange }: ResetConfirmDialogProps) {
  const [preserveMappings, setPreserveMappings] = useState(true);
  const { mutate: resetAll, isPending: isResetting } = useResetAllData();

  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  useModalBackHandler({
    isOpen: open,
    onClose: handleClose,
    modalId: 'reset-confirm-dialog',
  });

  const handleResetConfirm = () => {
    resetAll(preserveMappings, {
      onSuccess: () => {
        onOpenChange(false);
        setPreserveMappings(true); // 초기화 후 기본값으로 복원
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-sm mx-auto rounded-2xl">
        <DialogTitle className="sr-only">전체 초기화 확인</DialogTitle>
        <DialogDescription className="sr-only">
          모든 거래와 업로드 파일을 삭제하고 초기 상태로 되돌립니다.
        </DialogDescription>
        <div className="flex flex-col items-center text-center pt-4">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">
            전체 초기화
          </h3>
          <p className="text-sm text-slate-500 mb-4">
            모든 거래 내역과 업로드된 파일이
            <span className="text-red-500 font-medium"> 영구적으로 삭제</span>됩니다.
            <br />이 작업은 되돌릴 수 없습니다.
          </p>

          {/* 매핑 유지 체크박스 */}
          <label className="flex items-center gap-2 mb-6 cursor-pointer self-start px-2">
            <input
              type="checkbox"
              checked={preserveMappings}
              onChange={(e) => setPreserveMappings(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-[#3182F6] focus:ring-[#3182F6]"
            />
            <span className="text-sm text-slate-600">
              이름/카테고리 커스텀 설정은 유지
            </span>
          </label>

          <div className="flex gap-3 w-full">
            <button
              onClick={handleClose}
              disabled={isResetting}
              className="flex-1 py-3 text-sm font-medium text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleResetConfirm}
              disabled={isResetting}
              className="flex-1 py-3 text-sm font-medium text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isResetting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  초기화 중...
                </>
              ) : (
                '초기화'
              )}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
