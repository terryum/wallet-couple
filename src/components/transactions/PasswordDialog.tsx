/**
 * 비밀번호 입력 다이얼로그
 * 암호화된 엑셀 파일의 비밀번호를 입력받음
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Lock, Eye, EyeOff } from 'lucide-react';

/** 파일 패턴별 비밀번호 힌트 */
const PASSWORD_HINTS: Record<string, string> = {
  chak: '생년월일 8자리',
  // 추가 힌트는 여기에 추가
};

/** 파일명에서 힌트 패턴 찾기 */
function getPasswordHint(fileName: string): string | null {
  const lowerName = fileName.toLowerCase();
  for (const [pattern, hint] of Object.entries(PASSWORD_HINTS)) {
    if (lowerName.includes(pattern)) {
      return hint;
    }
  }
  return null;
}

interface PasswordDialogProps {
  /** 다이얼로그 표시 여부 */
  open: boolean;
  /** 파일명 */
  fileName: string;
  /** 비밀번호 제출 핸들러 */
  onSubmit: (password: string, savePassword: boolean) => void;
  /** 취소 핸들러 */
  onCancel: () => void;
  /** 건너뛰기 핸들러 */
  onSkip?: () => void;
  /** 에러 메시지 (잘못된 비밀번호 등) */
  error?: string;
}

export function PasswordDialog({
  open,
  fileName,
  onSubmit,
  onCancel,
  onSkip,
  error,
}: PasswordDialogProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [savePassword, setSavePassword] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  const hint = getPasswordHint(fileName);

  // 다이얼로그 열릴 때 초기화 및 포커스
  useEffect(() => {
    if (open) {
      setPassword('');
      setShowPassword(false);
      setSavePassword(true);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim()) {
      onSubmit(password, savePassword);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl w-[320px] shadow-xl">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-slate-500" />
            <h3 className="text-base font-bold text-slate-900">비밀번호 입력</h3>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 본문 */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* 파일명 */}
          <div className="text-sm text-slate-600 truncate">
            <span className="text-slate-400">파일: </span>
            {fileName}
          </div>

          {/* 힌트 */}
          {hint && (
            <div className="text-xs text-blue-600 bg-blue-50 px-3 py-2 rounded-lg">
              힌트: {hint}
            </div>
          )}

          {/* 비밀번호 입력 */}
          <div className="relative">
            <input
              ref={inputRef}
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호를 입력하세요"
              className="w-full px-4 py-3 pr-12 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="text-xs text-red-500 px-1">
              {error}
            </div>
          )}

          {/* 비밀번호 저장 체크박스 */}
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={savePassword}
              onChange={(e) => setSavePassword(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-xs text-slate-500">
              다음에도 사용하기 위해 비밀번호 저장
            </span>
          </label>

          {/* 버튼 */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              취소
            </button>
            {onSkip && (
              <button
                type="button"
                onClick={onSkip}
                className="flex-1 py-2.5 text-sm font-medium text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-xl transition-colors"
              >
                건너뛰기
              </button>
            )}
            <button
              type="submit"
              disabled={!password.trim()}
              className="flex-1 py-2.5 text-sm font-medium text-white bg-[#3182F6] hover:bg-[#1B64DA] disabled:bg-slate-300 disabled:cursor-not-allowed rounded-xl transition-colors"
            >
              확인
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
