/**
 * 설정 바텀시트 컴포넌트
 */

'use client';

import { useState } from 'react';
import { ChevronRight, FolderOpen, RotateCcw, Download, Smartphone, Check, Share, Tags } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FileManagement } from './FileManagement';
import { MappingsManagement } from './MappingsManagement';
import { ResetConfirmDialog } from './ResetConfirmDialog';
import { usePWAInstall } from '@/hooks/usePWAInstall';

interface SettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadClick?: () => void;
}

export function SettingsSheet({ open, onOpenChange, onUploadClick }: SettingsSheetProps) {
  const [fileManagementOpen, setFileManagementOpen] = useState(false);
  const [mappingsManagementOpen, setMappingsManagementOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [iosGuideOpen, setIosGuideOpen] = useState(false);
  const [desktopGuideOpen, setDesktopGuideOpen] = useState(false);

  const { isInstallable, isInstalled, isIOS, isInstalling, isMounted, promptInstall } = usePWAInstall();

  const handleFileManagementClick = () => {
    onOpenChange(false);
    setTimeout(() => {
      setFileManagementOpen(true);
    }, 200);
  };

  const handleMappingsManagementClick = () => {
    onOpenChange(false);
    setTimeout(() => {
      setMappingsManagementOpen(true);
    }, 200);
  };

  const handleResetClick = () => {
    onOpenChange(false);
    setTimeout(() => {
      setResetDialogOpen(true);
    }, 200);
  };

  const handleUploadFromFileManagement = () => {
    setFileManagementOpen(false);
    setTimeout(() => {
      onUploadClick?.();
    }, 200);
  };

  const handleInstallClick = async () => {
    if (isIOS) {
      // iOS는 수동 설치 안내 다이얼로그 표시
      onOpenChange(false);
      setTimeout(() => {
        setIosGuideOpen(true);
      }, 200);
    } else if (isInstallable) {
      // Android/Desktop은 설치 프롬프트 표시
      await promptInstall();
    } else {
      // beforeinstallprompt가 아직 발생하지 않은 경우 (Desktop 등)
      onOpenChange(false);
      setTimeout(() => {
        setDesktopGuideOpen(true);
      }, 200);
    }
  };

  return (
    <>
      {/* 설정 메뉴 시트 */}
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          <SheetHeader className="pb-4">
            <SheetTitle>설정</SheetTitle>
          </SheetHeader>

          <div className="space-y-2 pb-6">
            {/* 앱 설치 버튼 - 클라이언트에서 마운트 후 표시 */}
            {isMounted && !isInstalled && (
              <button
                onClick={handleInstallClick}
                disabled={isInstalling}
                className="w-full flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl hover:from-blue-100 hover:to-indigo-100 transition-all border border-blue-100"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#3182F6] to-[#6366f1] flex items-center justify-center shadow-sm">
                  <Smartphone className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-slate-900">
                    {isInstalling ? '설치 중...' : '앱 설치'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {isIOS ? 'Safari에서 홈 화면에 추가' : '홈 화면에 앱으로 설치'}
                  </p>
                </div>
                <Download className="w-5 h-5 text-[#3182F6]" />
              </button>
            )}

            {/* 이미 설치된 경우 */}
            {isMounted && isInstalled && (
              <div className="w-full flex items-center gap-3 p-4 bg-green-50 rounded-xl border border-green-100">
                <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                  <Check className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-green-700">
                    앱이 설치되어 있습니다
                  </p>
                  <p className="text-xs text-green-600">
                    전체화면 모드로 실행 중
                  </p>
                </div>
              </div>
            )}

            {/* 업로드 파일 관리 */}
            <button
              onClick={handleFileManagementClick}
              className="w-full flex items-center gap-3 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <FolderOpen className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-slate-900">
                  업로드 파일 관리
                </p>
                <p className="text-xs text-slate-500">
                  업로드된 파일 확인 및 삭제
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </button>

            {/* 패턴 매핑 관리 */}
            <button
              onClick={handleMappingsManagementClick}
              className="w-full flex items-center gap-3 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                <Tags className="w-5 h-5 text-purple-600" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-slate-900">
                  패턴 매핑 관리
                </p>
                <p className="text-xs text-slate-500">
                  자동 분류 규칙 확인 및 수정
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </button>

            {/* 초기화 버튼 */}
            <button
              onClick={handleResetClick}
              className="w-full flex items-center gap-3 p-4 bg-red-50 rounded-xl hover:bg-red-100 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                <RotateCcw className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-red-600">
                  초기화
                </p>
                <p className="text-xs text-red-400">
                  모든 데이터를 삭제하고 처음 상태로 복원
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-red-400" />
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* 파일 관리 모달 */}
      <Dialog open={fileManagementOpen} onOpenChange={setFileManagementOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-md mx-auto rounded-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold tracking-tight text-slate-900">
              업로드 파일 관리
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto -mx-6 px-6">
            <FileManagement onUploadClick={handleUploadFromFileManagement} />
          </div>
        </DialogContent>
      </Dialog>

      {/* 패턴 매핑 관리 모달 */}
      <Dialog open={mappingsManagementOpen} onOpenChange={setMappingsManagementOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-md mx-auto rounded-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold tracking-tight text-slate-900">
              패턴 매핑 관리
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto -mx-6 px-6">
            <MappingsManagement />
          </div>
        </DialogContent>
      </Dialog>

      {/* 공유 초기화 다이얼로그 */}
      <ResetConfirmDialog
        open={resetDialogOpen}
        onOpenChange={setResetDialogOpen}
      />

      {/* iOS 설치 안내 다이얼로그 */}
      <Dialog open={iosGuideOpen} onOpenChange={setIosGuideOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-sm mx-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-[#3182F6]" />
              앱 설치 방법
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <p className="text-sm text-slate-600">
              Safari 브라우저에서 다음 단계를 따라해주세요:
            </p>

            <div className="space-y-3">
              {/* Step 1 */}
              <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                <div className="w-7 h-7 rounded-full bg-[#3182F6] text-white flex items-center justify-center text-sm font-bold shrink-0">
                  1
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">공유 버튼 탭</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    화면 하단의 <Share className="w-3.5 h-3.5 inline text-[#3182F6]" /> 아이콘을 탭하세요
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                <div className="w-7 h-7 rounded-full bg-[#3182F6] text-white flex items-center justify-center text-sm font-bold shrink-0">
                  2
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">홈 화면에 추가</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    스크롤하여 "홈 화면에 추가"를 탭하세요
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                <div className="w-7 h-7 rounded-full bg-[#3182F6] text-white flex items-center justify-center text-sm font-bold shrink-0">
                  3
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">추가 완료</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    오른쪽 상단의 "추가"를 탭하면 완료!
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setIosGuideOpen(false)}
                className="w-full py-2.5 text-sm font-medium text-white bg-[#3182F6] rounded-xl hover:bg-[#1B64DA] transition-colors"
              >
                확인
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Desktop/Android 설치 안내 다이얼로그 */}
      <Dialog open={desktopGuideOpen} onOpenChange={setDesktopGuideOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-sm mx-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-[#3182F6]" />
              앱 설치 방법
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <p className="text-sm text-slate-600">
              브라우저에서 앱으로 설치할 수 있습니다:
            </p>

            <div className="space-y-3">
              {/* Chrome/Edge */}
              <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                <div className="w-7 h-7 rounded-full bg-[#3182F6] text-white flex items-center justify-center text-sm font-bold shrink-0">
                  1
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">주소창 확인</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    주소창 오른쪽에 설치 아이콘 (⊕ 또는 📥)이 있습니다
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                <div className="w-7 h-7 rounded-full bg-[#3182F6] text-white flex items-center justify-center text-sm font-bold shrink-0">
                  2
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">설치 클릭</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    아이콘을 클릭하고 "설치"를 선택하세요
                  </p>
                </div>
              </div>

              {/* Android */}
              <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">Android 모바일</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Chrome 메뉴(⋮) → "홈 화면에 추가"를 선택하세요
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setDesktopGuideOpen(false)}
                className="w-full py-2.5 text-sm font-medium text-white bg-[#3182F6] rounded-xl hover:bg-[#1B64DA] transition-colors"
              >
                확인
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
