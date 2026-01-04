/**
 * 플로팅 액션 버튼 컴포넌트
 * 파일 업로드 + 내역 추가 버튼
 */

'use client';

import { Plus } from 'lucide-react';

interface FloatingActionButtonsProps {
  /** 파일 업로드 버튼 클릭 핸들러 */
  onUploadClick: () => void;
  /** 내역 추가 버튼 클릭 핸들러 */
  onAddClick: () => void;
  /** 파일 버튼 라벨 (기본: "파일") */
  uploadLabel?: string;
  /** 추가 버튼 라벨 (기본: "내역") */
  addLabel?: string;
  /** 파일 버튼 숨김 여부 */
  hideUpload?: boolean;
  /** 추가 버튼 숨김 여부 */
  hideAdd?: boolean;
}

export function FloatingActionButtons({
  onUploadClick,
  onAddClick,
  uploadLabel = '파일',
  addLabel = '내역',
  hideUpload = false,
  hideAdd = false,
}: FloatingActionButtonsProps) {
  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 flex gap-3 z-50">
      {!hideUpload && (
        <button
          onClick={onUploadClick}
          className="flex items-center gap-2 px-4 py-3 bg-brand text-white rounded-2xl shadow-lg hover:bg-brand-hover active:scale-95 transition-all"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
            />
          </svg>
          <span className="text-sm font-medium">{uploadLabel}</span>
        </button>
      )}
      {!hideAdd && (
        <button
          onClick={onAddClick}
          className="flex items-center gap-2 px-4 py-3 bg-brand text-white rounded-2xl shadow-lg hover:bg-brand-hover active:scale-95 transition-all"
        >
          <Plus className="w-5 h-5" />
          <span className="text-sm font-medium">{addLabel}</span>
        </button>
      )}
    </div>
  );
}
