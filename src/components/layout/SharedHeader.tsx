/**
 * 공통 헤더 컴포넌트
 * 월 선택, Owner 선택, 사용자 설정 드롭다운 포함
 */

'use client';

import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { formatYearMonth } from '@/lib/utils/format';
import { SettingsDropdown } from '@/components/settings';
import { FileUploader, type FileUploaderRef } from '@/components/transactions';

export function SharedHeader() {
  const fileUploaderRef = useRef<FileUploaderRef>(null);

  const {
    selectedMonth,
    goToPrevMonth,
    goToNextMonth,
    selectedOwner,
    setSelectedOwner,
    currentUser,
  } = useAppContext();

  return (
    <header className="bg-white px-4 py-3">
      <div className="max-w-lg mx-auto flex items-center justify-between gap-2">
        {/* 월 선택기 */}
        <div className="flex items-center shrink-0">
          <button
            onClick={goToPrevMonth}
            className="p-1.5 rounded-lg hover:bg-slate-100 active:scale-95 transition-all"
          >
            <ChevronLeft className="w-5 h-5 text-slate-500" />
          </button>
          <span className="text-base font-bold tracking-tight text-slate-900 min-w-[90px] text-center">
            {formatYearMonth(selectedMonth)}
          </span>
          <button
            onClick={goToNextMonth}
            className="p-1.5 rounded-lg hover:bg-slate-100 active:scale-95 transition-all"
          >
            <ChevronRight className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Owner 선택 + 사용자 설정 */}
        <div className="flex gap-1 shrink-0 items-center">
          <button
            onClick={() => setSelectedOwner(null)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              selectedOwner === null
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-500'
            }`}
          >
            전체
          </button>
          <button
            onClick={() => setSelectedOwner('husband')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              selectedOwner === 'husband'
                ? 'bg-blue-500 text-white'
                : 'bg-slate-100 text-slate-500'
            }`}
          >
            남편
          </button>
          <button
            onClick={() => setSelectedOwner('wife')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              selectedOwner === 'wife'
                ? 'bg-pink-500 text-white'
                : 'bg-slate-100 text-slate-500'
            }`}
          >
            아내
          </button>

          {/* 사용자 설정 드롭다운 */}
          <SettingsDropdown onUploadClick={() => fileUploaderRef.current?.trigger()} />
        </div>

        {/* 숨겨진 파일 업로더 */}
        <FileUploader ref={fileUploaderRef} owner={currentUser} hidden />
      </div>
    </header>
  );
}
