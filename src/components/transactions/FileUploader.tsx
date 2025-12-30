/**
 * 파일 업로드 컴포넌트
 * Design System: Apple/Clean Style
 * 비밀번호 보호 파일 지원
 * 스트리밍 진행 상황 표시 및 취소 기능
 */

'use client';

import { useRef, useState, forwardRef, useImperativeHandle, useCallback } from 'react';
import { Upload, Loader2, CheckCircle2, AlertCircle, FileSpreadsheet, X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import type { Owner } from '@/types';
import { PasswordDialog } from './PasswordDialog';
import { UploadResultPopup } from './UploadResultPopup';

interface FileUploaderProps {
  owner: Owner;
  onSuccess?: () => void;
  hidden?: boolean;
}

export interface FileUploaderRef {
  trigger: () => void;
  handleFiles: (files: FileList | File[]) => Promise<void>;
}

/** 파일 처리 상태 */
type FileStatus = 'pending' | 'uploading' | 'parsing' | 'classifying' | 'saving' | 'completed' | 'error';

interface FileProgress {
  name: string;
  displayName: string;
  status: FileStatus;
  /** AI 분류 진행 상황 */
  classifyProgress?: {
    current: number;
    total: number;
  };
  result?: {
    sourceType: string;
    inserted: number;
    duplicates: number;
    fileId?: string;
  };
  error?: string;
  error_code?: string;
}

/** 비밀번호 저장 키 prefix */
const PASSWORD_STORAGE_KEY = 'wallet_card_passwords';

/** 저장된 비밀번호 가져오기 */
function getSavedPasswords(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem(PASSWORD_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

/** 비밀번호 저장하기 */
function savePassword(pattern: string, password: string): void {
  if (typeof window === 'undefined') return;
  try {
    const passwords = getSavedPasswords();
    passwords[pattern] = password;
    localStorage.setItem(PASSWORD_STORAGE_KEY, JSON.stringify(passwords));
  } catch {
    // 저장 실패 무시
  }
}

/** 파일명에서 비밀번호 패턴 찾기 (저장/로드용) */
function getPasswordPattern(fileName: string): string | null {
  const lowerName = fileName.toLowerCase();
  const patterns = ['chak']; // 지원하는 패턴들
  for (const pattern of patterns) {
    if (lowerName.includes(pattern)) {
      return pattern;
    }
  }
  return null;
}

/** 파일에 대해 저장된 비밀번호 가져오기 */
function getSavedPasswordForFile(fileName: string): string | null {
  const pattern = getPasswordPattern(fileName);
  if (!pattern) return null;
  const passwords = getSavedPasswords();
  return passwords[pattern] || null;
}

/** 파일명에서 카드사 추출 (분석 중 표시용, 월 정보는 서버에서 결정) */
function getCardType(fileName: string): string {
  const name = fileName.toLowerCase();

  if (name.includes('hyundai') || name.includes('현대')) {
    return '현대카드';
  } else if (name.includes('samsung') || name.includes('삼성')) {
    return '삼성카드';
  } else if (name.includes('lotte') || name.includes('롯데') || name.includes('이용대금명세서')) {
    return '롯데카드';
  } else if (name.includes('kb') || name.includes('국민') || name.includes('usage')) {
    return 'KB국민카드';
  } else {
    return '명세서';
  }
}

export const FileUploader = forwardRef<FileUploaderRef, FileUploaderProps>(
  function FileUploader({ owner, onSuccess, hidden }, ref) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // 취소를 위한 상태
  const [isCancelling, setIsCancelling] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const createdFileIdsRef = useRef<string[]>([]);

  // 업로드 결과 팝업 상태
  const [showResultPopup, setShowResultPopup] = useState(false);
  const [resultFileId, setResultFileId] = useState<string | null>(null);
  const [resultDisplayName, setResultDisplayName] = useState<string>('');

  /** 업로드 취소 및 롤백 */
  const handleCancel = async () => {
    setIsCancelling(true);

    // 스트리밍 연결 중단
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // 생성된 파일들 롤백
    if (createdFileIdsRef.current.length > 0) {
      try {
        await fetch('/api/upload-stream', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileIds: createdFileIdsRef.current }),
        });
      } catch (error) {
        console.error('롤백 실패:', error);
      }
    }

    // 상태 초기화
    setIsProcessing(false);
    setIsCancelling(false);
    setFileProgresses([]);
    createdFileIdsRef.current = [];
    abortControllerRef.current = null;

    // 결과 메시지
    setIsError(true);
    setResultMessage('업로드가 취소되었습니다.');
    setShowResult(true);
    setTimeout(() => {
      setShowResult(false);
    }, 3000);
  };

  /** 단일 파일 스트리밍 처리 */
  const processSingleFileWithStreaming = async (
    file: File,
    fileIndex: number,
    totalFiles: number,
    password?: string
  ): Promise<{
    success?: boolean;
    needPassword?: boolean;
    error_code?: string;
    inserted?: number;
    duplicates?: number;
    fileId?: string;
  }> => {
    const formData = new FormData();
    formData.append('files', file);
    formData.append('owner', owner);
    if (password) {
      formData.append('password', password);
    }

    try {
      const response = await fetch('/api/upload-stream', {
        method: 'POST',
        body: formData,
        signal: abortControllerRef.current?.signal,
      });

      if (!response.ok) {
        throw new Error('업로드 실패');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('스트림을 읽을 수 없습니다.');

      const decoder = new TextDecoder();
      let buffer = '';
      let inserted = 0;
      let duplicates = 0;
      let fileId: string | undefined;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            const eventType = line.slice(7);
            const dataLine = lines[lines.indexOf(line) + 1];
            if (dataLine?.startsWith('data: ')) {
              const data = JSON.parse(dataLine.slice(6));

              switch (eventType) {
                case 'file_start':
                  setCurrentIndex(fileIndex);
                  setFileProgresses((prev) =>
                    prev.map((p, idx) =>
                      idx === fileIndex ? { ...p, status: 'uploading' } : p
                    )
                  );
                  break;

                case 'parsing':
                  setFileProgresses((prev) =>
                    prev.map((p, idx) =>
                      idx === fileIndex ? { ...p, status: 'parsing' } : p
                    )
                  );
                  break;

                case 'classifying_start':
                  setFileProgresses((prev) =>
                    prev.map((p, idx) =>
                      idx === fileIndex
                        ? { ...p, status: 'classifying', classifyProgress: { current: 0, total: data.total } }
                        : p
                    )
                  );
                  break;

                case 'classifying_progress':
                  setFileProgresses((prev) =>
                    prev.map((p, idx) =>
                      idx === fileIndex
                        ? { ...p, classifyProgress: { current: data.current, total: data.total } }
                        : p
                    )
                  );
                  break;

                case 'classifying_complete':
                  break;

                case 'saving':
                  setFileProgresses((prev) =>
                    prev.map((p, idx) =>
                      idx === fileIndex ? { ...p, status: 'saving' } : p
                    )
                  );
                  break;

                case 'file_complete':
                  if (data.fileId) {
                    createdFileIdsRef.current.push(data.fileId);
                    fileId = data.fileId;
                  }
                  inserted = data.inserted || 0;
                  duplicates = data.duplicates || 0;
                  setFileProgresses((prev) =>
                    prev.map((p, idx) =>
                      idx === fileIndex
                        ? {
                            ...p,
                            status: 'completed',
                            displayName: data.displayName || p.displayName,
                            result: {
                              sourceType: data.sourceType,
                              inserted: data.inserted,
                              duplicates: data.duplicates,
                              fileId: data.fileId,
                            },
                          }
                        : p
                    )
                  );
                  break;

                case 'file_error':
                  // 비밀번호 필요 에러는 별도 처리
                  if (data.error_code === 'PASSWORD_REQUIRED' || data.error_code === 'WRONG_PASSWORD') {
                    return { needPassword: true, error_code: data.error_code };
                  }
                  setFileProgresses((prev) =>
                    prev.map((p, idx) =>
                      idx === fileIndex
                        ? { ...p, status: 'error', error: data.error, error_code: data.error_code }
                        : p
                    )
                  );
                  return { success: false };

                case 'complete':
                  break;

                case 'error':
                  return { success: false };
              }
            }
          }
        }
      }

      return { success: true, inserted, duplicates, fileId };
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        return { success: false };
      }
      throw error;
    }
  };

  /** 파일 배열 처리 (공통 로직) - 파일별 개별 처리 */
  const processFiles = async (fileArray: File[]) => {
    if (fileArray.length === 0) return;

    // 초기 상태 설정 (카드사만 표시, 월 정보는 서버 응답 후)
    const initialProgresses: FileProgress[] = fileArray.map((file) => ({
      name: file.name,
      displayName: getCardType(file.name),
      status: 'pending',
    }));

    setFileProgresses(initialProgresses);
    setCurrentIndex(0);
    setIsProcessing(true);

    // AbortController 생성
    abortControllerRef.current = new AbortController();
    createdFileIdsRef.current = [];

    let totalInserted = 0;
    let totalDuplicates = 0;
    let hasError = false;
    let cancelled = false;

    // 파일별 비밀번호 저장
    const filePasswords: Map<string, string> = new Map();

    // 파일별 개별 처리
    for (let fileIndex = 0; fileIndex < fileArray.length; fileIndex++) {
      if (cancelled || abortControllerRef.current?.signal.aborted) {
        break;
      }

      const file = fileArray[fileIndex];
      setCurrentIndex(fileIndex);

      // 저장된 비밀번호 확인
      let password = getSavedPasswordForFile(file.name);
      const filePattern = getPasswordPattern(file.name);
      if (filePattern && filePasswords.has(filePattern)) {
        password = filePasswords.get(filePattern) || password;
      }

      // 첫 시도
      let result = await processSingleFileWithStreaming(
        file,
        fileIndex,
        fileArray.length,
        password || undefined
      );

      // 비밀번호가 필요한 경우 처리 (건너뛰기 전까지 무한 재시도)
      let lastEnteredPassword: string | null = null;

      while (result?.needPassword) {
        // 에러 메시지 설정 (틀린 비밀번호인 경우)
        if (result.error_code === 'WRONG_PASSWORD') {
          setPasswordError('비밀번호가 올바르지 않습니다.');
        } else {
          setPasswordError('');
        }

        // 올바른 파일 정보로 비밀번호 요청
        const passwordResult = await requestPasswordWithSkip(file, fileIndex);

        if (passwordResult === null) {
          // 사용자가 취소함 - 전체 중단
          cancelled = true;
          hasError = true;
          setFileProgresses((prev) =>
            prev.map((p, idx) =>
              idx === fileIndex
                ? { ...p, status: 'error', error: '업로드가 취소되었습니다.' }
                : p
            )
          );
          break;
        }

        if (passwordResult === 'SKIP') {
          // 건너뛰기 선택
          setFileProgresses((prev) =>
            prev.map((p, idx) =>
              idx === fileIndex
                ? { ...p, status: 'error', error: '건너뜀' }
                : p
            )
          );
          break;
        }

        // 입력한 비밀번호 임시 저장
        lastEnteredPassword = passwordResult;

        // 비밀번호로 재시도
        result = await processSingleFileWithStreaming(
          file,
          fileIndex,
          fileArray.length,
          passwordResult
        );

        // 성공하면 비밀번호 저장
        if (result?.success && lastEnteredPassword) {
          // 세션 내 재사용을 위해 저장
          if (filePattern) {
            filePasswords.set(filePattern, lastEnteredPassword);
          }
          // localStorage에 저장 (사용자가 체크한 경우만)
          if (savePasswordFlagRef.current && filePattern) {
            savePassword(filePattern, lastEnteredPassword);
          }
        }
      }

      // 결과 집계
      if (result?.success) {
        totalInserted += result.inserted || 0;
        totalDuplicates += result.duplicates || 0;
      } else if (!result?.needPassword) {
        hasError = true;
      }
    }

    if (cancelled) {
      // 취소된 경우 - 이미 처리됨
    }

    // 모든 파일 처리 완료
    await new Promise((r) => setTimeout(r, 500));
    setIsProcessing(false);
    abortControllerRef.current = null;

    // 결과 캐시 갱신
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    queryClient.invalidateQueries({ queryKey: ['uploaded_files'] });

    // 결과 메시지
    setIsError(hasError && totalInserted === 0);
    setResultMessage(
      totalInserted > 0
        ? `${totalInserted}건 추가 완료${totalDuplicates > 0 ? ` (중복 ${totalDuplicates}건 제외)` : ''}`
        : '추가된 항목이 없습니다.'
    );
    setShowResult(true);

    // 성공 시 업로드 결과 팝업 표시 준비
    const uploadedFileId = createdFileIdsRef.current[0];
    const uploadedDisplayName = fileProgresses.find(fp => fp.result?.fileId === uploadedFileId)?.displayName;

    setTimeout(() => {
      setShowResult(false);
      setFileProgresses([]);

      // 성공적으로 업로드된 파일이 있으면 팝업 표시
      if (totalInserted > 0 && uploadedFileId) {
        setResultFileId(uploadedFileId);
        setResultDisplayName(uploadedDisplayName || '업로드 내역');
        setShowResultPopup(true);
      }

      createdFileIdsRef.current = [];
    }, 2000);

    onSuccess?.();
  };

  // 외부에서 트리거할 수 있도록 노출
  useImperativeHandle(ref, () => ({
    trigger: () => {
      fileInputRef.current?.click();
    },
    handleFiles: async (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      await processFiles(fileArray);
    },
  }));

  const [isProcessing, setIsProcessing] = useState(false);
  const [fileProgresses, setFileProgresses] = useState<FileProgress[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [resultMessage, setResultMessage] = useState('');
  const [isError, setIsError] = useState(false);

  // 비밀번호 다이얼로그 상태
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordFileName, setPasswordFileName] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const pendingFileRef = useRef<{ file: File; index: number } | null>(null);
  const passwordResolveRef = useRef<((password: string | null) => void) | null>(null);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  // 비밀번호 저장 여부 임시 저장
  const savePasswordFlagRef = useRef(true);

  /** 비밀번호 다이얼로그에서 비밀번호 제출 */
  const handlePasswordSubmit = useCallback(
    (password: string, shouldSave: boolean) => {
      if (!pendingFileRef.current) return;

      // 비밀번호 저장 플래그만 저장 (실제 저장은 성공 후에)
      savePasswordFlagRef.current = shouldSave;

      // 다이얼로그 닫기 (에러는 유지 - 틀리면 다시 표시됨)
      setPasswordDialogOpen(false);

      // resolve로 비밀번호 전달
      if (passwordResolveRef.current) {
        passwordResolveRef.current(password);
        passwordResolveRef.current = null;
      }
      pendingFileRef.current = null;
    },
    []
  );

  /** 비밀번호 다이얼로그 취소 */
  const handlePasswordCancel = useCallback(() => {
    setPasswordDialogOpen(false);
    setPasswordError('');
    if (passwordResolveRef.current) {
      passwordResolveRef.current(null);
      passwordResolveRef.current = null;
    }
    pendingFileRef.current = null;
  }, []);

  /** 비밀번호 입력을 기다리는 Promise 반환 (건너뛰기 지원) */
  const requestPasswordWithSkip = useCallback(
    (file: File, index: number): Promise<string | null | 'SKIP'> => {
      return new Promise((resolve) => {
        pendingFileRef.current = { file, index };
        passwordResolveRef.current = resolve as (value: string | null) => void;
        setPasswordFileName(file.name);
        setPasswordDialogOpen(true);
      });
    },
    []
  );

  /** 비밀번호 다이얼로그에서 건너뛰기 */
  const handlePasswordSkip = useCallback(() => {
    setPasswordDialogOpen(false);
    setPasswordError('');
    if (passwordResolveRef.current) {
      (passwordResolveRef.current as (value: string | null | 'SKIP') => void)('SKIP');
      passwordResolveRef.current = null;
    }
    pendingFileRef.current = null;
  }, []);

  /** 단일 파일 업로드 결과 타입 */
  interface UploadResult {
    sourceType: string;
    inserted: number;
    duplicates: number;
    displayName?: string;
    error?: string;
    error_code?: string;
  }

  /** 단일 파일 업로드 */
  const uploadSingleFile = async (
    file: File,
    password?: string
  ): Promise<UploadResult | null> => {
    const formData = new FormData();
    formData.append('files', file);
    formData.append('owner', owner);
    if (password) {
      formData.append('password', password);
    }

    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      throw new Error('업로드 실패');
    }

    const data = await res.json();
    if (data.results && data.results[0]) {
      const result = data.results[0];
      // 에러가 있는 경우도 반환
      if (result.error) {
        return {
          sourceType: result.sourceType,
          inserted: 0,
          duplicates: 0,
          displayName: result.displayName,
          error: result.error,
          error_code: result.error_code,
        };
      }
      return {
        sourceType: result.sourceType,
        inserted: result.inserted,
        duplicates: result.duplicates,
        displayName: result.displayName,
      };
    }
    return null;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    await processFiles(fileArray);

    // 같은 파일 재선택 가능하도록 초기화
    e.target.value = '';
  };

  /** 현재 처리 중인 파일 정보 */
  const currentFile = fileProgresses[currentIndex];
  const totalFiles = fileProgresses.length;

  /** 상태별 텍스트 */
  const getStatusText = (file: FileProgress) => {
    switch (file.status) {
      case 'uploading':
        return '업로드 중...';
      case 'parsing':
        return '파일 분석 중...';
      case 'classifying':
        if (file.classifyProgress) {
          return `AI 분류 중 (${file.classifyProgress.current}/${file.classifyProgress.total})`;
        }
        return 'AI 분류 중...';
      case 'saving':
        return '저장 중...';
      case 'completed':
        return '완료';
      case 'error':
        return '실패';
      default:
        return '대기 중';
    }
  };

  /** AI 분류 진행률 계산 */
  const getClassifyProgress = (file: FileProgress): number => {
    if (file.status !== 'classifying' || !file.classifyProgress) return 0;
    if (file.classifyProgress.total === 0) return 0;
    return (file.classifyProgress.current / file.classifyProgress.total) * 100;
  };

  return (
    <>
      {/* 숨겨진 파일 입력 */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xls,.xlsx,.csv"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />

      {/* 업로드 버튼 (hidden일 때는 렌더링하지 않음) */}
      {!hidden && (
        <button
          onClick={handleClick}
          disabled={isProcessing}
          className="flex items-center gap-2 h-10 px-4 bg-[#3182F6] text-white text-sm font-medium rounded-xl hover:bg-[#1B64DA] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>처리 중...</span>
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              <span>업로드</span>
            </>
          )}
        </button>
      )}

      {/* 상세 진행 상태 오버레이 */}
      {isProcessing && currentFile && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-[320px] shadow-xl">
            {/* 진행률 표시 */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-slate-500">파일 처리 중</span>
              <span className="text-sm font-bold text-[#3182F6]">
                {currentIndex + 1} / {totalFiles}
              </span>
            </div>

            {/* 파일 프로그레스 바 */}
            <div className="h-2 bg-slate-100 rounded-full mb-2 overflow-hidden">
              <div
                className="h-full bg-[#3182F6] transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / totalFiles) * 100}%` }}
              />
            </div>

            {/* AI 분류 진행률 바 (분류 중일 때만 표시) */}
            {currentFile.status === 'classifying' && currentFile.classifyProgress && (
              <div className="mb-4">
                <div className="h-1.5 bg-amber-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 transition-all duration-200"
                    style={{ width: `${getClassifyProgress(currentFile)}%` }}
                  />
                </div>
              </div>
            )}

            {/* 현재 파일 상태 */}
            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
              {currentFile.status === 'completed' ? (
                <CheckCircle2 className="w-8 h-8 text-emerald-500 shrink-0" />
              ) : currentFile.status === 'error' ? (
                <AlertCircle className="w-8 h-8 text-red-500 shrink-0" />
              ) : (
                <div className="relative">
                  <FileSpreadsheet className="w-8 h-8 text-slate-400 shrink-0" />
                  <Loader2 className="w-4 h-4 text-[#3182F6] animate-spin absolute -bottom-1 -right-1" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-900 truncate">
                  {currentFile.displayName}
                </p>
                <p className="text-xs text-slate-500">
                  {getStatusText(currentFile)}
                </p>
              </div>
            </div>

            {/* 완료된 파일 목록 */}
            {currentIndex > 0 && (
              <div className="mt-4 max-h-32 overflow-y-auto">
                {fileProgresses.slice(0, currentIndex).map((fp, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 py-1.5 text-xs text-slate-500"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span className="truncate">{fp.displayName}</span>
                    {fp.result && (
                      <span className="ml-auto shrink-0 font-medium text-slate-700">
                        +{fp.result.inserted}건
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* 취소 버튼 */}
            <button
              onClick={handleCancel}
              disabled={isCancelling}
              className="mt-4 w-full py-2.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isCancelling ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  취소 중...
                </>
              ) : (
                <>
                  <X className="w-4 h-4" />
                  업로드 취소
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* 결과 토스트 */}
      {showResult && (
        <div
          className={`fixed bottom-28 left-1/2 -translate-x-1/2 px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 z-50 ${
            isError ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'
          }`}
        >
          {isError ? (
            <AlertCircle className="w-5 h-5" />
          ) : (
            <CheckCircle2 className="w-5 h-5" />
          )}
          <span className="text-sm font-medium">{resultMessage}</span>
        </div>
      )}

      {/* 비밀번호 입력 다이얼로그 */}
      <PasswordDialog
        open={passwordDialogOpen}
        fileName={passwordFileName}
        onSubmit={handlePasswordSubmit}
        onCancel={handlePasswordCancel}
        onSkip={handlePasswordSkip}
        error={passwordError}
      />

      {/* 업로드 결과 팝업 */}
      <UploadResultPopup
        open={showResultPopup}
        onOpenChange={setShowResultPopup}
        fileId={resultFileId}
        displayName={resultDisplayName}
      />
    </>
  );
});
