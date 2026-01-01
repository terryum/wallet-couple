/**
 * 설정 드롭다운 메뉴 컴포넌트
 * 사용자 아이콘 클릭 시 아래로 열리는 메뉴
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRightLeft, FolderOpen, RotateCcw, History, Smartphone, Download, Check, Tags, Share } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { FileManagement } from './FileManagement';
import { MappingsManagement } from './MappingsManagement';
import { HistoryModal } from './HistoryModal';
import { ResetConfirmDialog } from './ResetConfirmDialog';
import { useAppContext } from '@/contexts/AppContext';
import { useModalBackHandler } from '@/hooks/useModalBackHandler';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import type { Owner } from '@/types';

/** 남자 아이콘 */
function MaleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="7" r="4" />
      <path d="M5.5 21v-2a6.5 6.5 0 0 1 13 0v2" />
    </svg>
  );
}

/** 여자 아이콘 */
function FemaleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="7" r="4" />
      <path d="M5.5 21v-2a6.5 6.5 0 0 1 13 0v2" />
      <path d="M12 14v3" />
      <path d="M10 16h4" />
    </svg>
  );
}

interface SettingsDropdownProps {
  onUploadClick?: () => void;
}

export function SettingsDropdown({ onUploadClick }: SettingsDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [fileManagementOpen, setFileManagementOpen] = useState(false);
  const [mappingsManagementOpen, setMappingsManagementOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [iosGuideOpen, setIosGuideOpen] = useState(false);
  const [desktopGuideOpen, setDesktopGuideOpen] = useState(false);

  const { currentUser, setCurrentUser } = useAppContext();
  const { isInstallable, isInstalled, isIOS, isInstalling, isMounted, promptInstall } = usePWAInstall();

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSwitchUser = () => {
    const newUser: Owner = currentUser === 'husband' ? 'wife' : 'husband';
    setCurrentUser(newUser);
    setIsOpen(false);
  };

  const handleHistoryClick = () => {
    setIsOpen(false);
    setTimeout(() => {
      setHistoryModalOpen(true);
    }, 100);
  };

  const handleFileManagementClick = () => {
    setIsOpen(false);
    setTimeout(() => {
      setFileManagementOpen(true);
    }, 100);
  };

  const handleMappingsManagementClick = () => {
    setIsOpen(false);
    setTimeout(() => {
      setMappingsManagementOpen(true);
    }, 100);
  };

  const handleInstallClick = async () => {
    setIsOpen(false);
    if (isIOS) {
      setTimeout(() => {
        setIosGuideOpen(true);
      }, 100);
    } else if (isInstallable) {
      await promptInstall();
    } else {
      setTimeout(() => {
        setDesktopGuideOpen(true);
      }, 100);
    }
  };

  const handleResetClick = () => {
    setIsOpen(false);
    setTimeout(() => {
      setResetDialogOpen(true);
    }, 100);
  };

  const handleUploadFromFileManagement = () => {
    setFileManagementOpen(false);
    setTimeout(() => {
      onUploadClick?.();
    }, 100);
  };

  const handleFileManagementClose = useCallback(() => {
    setFileManagementOpen(false);
  }, []);

  const handleMappingsManagementClose = useCallback(() => {
    setMappingsManagementOpen(false);
  }, []);

  const handleIosGuideClose = useCallback(() => {
    setIosGuideOpen(false);
  }, []);

  const handleDesktopGuideClose = useCallback(() => {
    setDesktopGuideOpen(false);
  }, []);

  useModalBackHandler({
    isOpen: fileManagementOpen,
    onClose: handleFileManagementClose,
    modalId: 'settings-dropdown-file-management',
    disabled:
      mappingsManagementOpen ||
      resetDialogOpen ||
      historyModalOpen ||
      iosGuideOpen ||
      desktopGuideOpen,
  });

  useModalBackHandler({
    isOpen: mappingsManagementOpen,
    onClose: handleMappingsManagementClose,
    modalId: 'settings-dropdown-mappings-management',
    disabled:
      fileManagementOpen ||
      resetDialogOpen ||
      historyModalOpen ||
      iosGuideOpen ||
      desktopGuideOpen,
  });

  useModalBackHandler({
    isOpen: iosGuideOpen,
    onClose: handleIosGuideClose,
    modalId: 'settings-dropdown-ios-guide',
    disabled:
      fileManagementOpen ||
      mappingsManagementOpen ||
      resetDialogOpen ||
      historyModalOpen ||
      desktopGuideOpen,
  });

  useModalBackHandler({
    isOpen: desktopGuideOpen,
    onClose: handleDesktopGuideClose,
    modalId: 'settings-dropdown-desktop-guide',
    disabled:
      fileManagementOpen ||
      mappingsManagementOpen ||
      resetDialogOpen ||
      historyModalOpen ||
      iosGuideOpen,
  });

  // 현재 사용자 및 전환 대상 아이콘/텍스트
  const CurrentIcon = currentUser === 'husband' ? MaleIcon : FemaleIcon;
  const SwitchIcon = currentUser === 'husband' ? FemaleIcon : MaleIcon;
  const switchToText = currentUser === 'husband' ? '아내' : '남편';
  const currentIconBgColor = currentUser === 'husband' ? 'bg-blue-500' : 'bg-pink-500';
  const currentIconHoverColor = currentUser === 'husband' ? 'hover:bg-blue-600' : 'hover:bg-pink-600';

  return (
    <>
      <div className="relative">
        {/* 사용자 아이콘 버튼 */}
        <button
          ref={buttonRef}
          onClick={() => setIsOpen(!isOpen)}
          className={`p-1.5 rounded-lg ${currentIconBgColor} ${currentIconHoverColor} active:scale-95 transition-all`}
        >
          <CurrentIcon className="w-5 h-5 text-white" />
        </button>

        {/* 드롭다운 메뉴 */}
        {isOpen && (
          <div
            ref={dropdownRef}
            className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-50"
          >
            {/* 1. 계정 전환 */}
            <button
              onClick={handleSwitchUser}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors"
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${currentUser === 'husband' ? 'bg-pink-100' : 'bg-blue-100'}`}>
                <SwitchIcon className={`w-4 h-4 ${currentUser === 'husband' ? 'text-pink-600' : 'text-blue-600'}`} />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-slate-900">계정 전환</p>
                <p className="text-xs text-slate-500">{switchToText}(으)로 전환</p>
              </div>
              <ArrowRightLeft className="w-4 h-4 text-slate-400" />
            </button>

            <div className="border-t border-slate-100 my-1" />

            {/* 2. 파일 관리 */}
            <button
              onClick={handleFileManagementClick}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <FolderOpen className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-slate-900">파일 관리</p>
              </div>
            </button>

            {/* 3. 패턴 매핑 관리 */}
            <button
              onClick={handleMappingsManagementClick}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                <Tags className="w-4 h-4 text-purple-600" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-slate-900">패턴 매핑 관리</p>
                <p className="text-xs text-slate-500">자동 분류 규칙 관리</p>
              </div>
            </button>

            {/* 4. 변경 히스토리 */}
            <button
              onClick={handleHistoryClick}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                <History className="w-4 h-4 text-amber-600" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-slate-900">변경 히스토리</p>
              </div>
            </button>

            {/* 5. 앱 설치 - 클라이언트에서 마운트 후 미설치 상태일 때만 표시 */}
            {isMounted && !isInstalled && (
              <button
                onClick={handleInstallClick}
                disabled={isInstalling}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                  <Smartphone className="w-4 h-4 text-slate-600" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-slate-900">
                    {isInstalling ? '설치 중...' : '앱 설치'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {isIOS ? 'Safari에서 홈 화면에 추가' : '홈 화면에 앱으로 설치'}
                  </p>
                </div>
                <Download className="w-4 h-4 text-slate-400" />
              </button>
            )}

            {/* 이미 설치된 경우 */}
            {isMounted && isInstalled && (
              <div className="w-full flex items-center gap-3 px-4 py-2.5">
                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                  <Check className="w-4 h-4 text-green-600" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-green-700">앱 설치됨</p>
                </div>
              </div>
            )}

            <div className="border-t border-slate-100 my-1" />

            {/* 6. 초기화 */}
            <button
              onClick={handleResetClick}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                <RotateCcw className="w-4 h-4 text-red-600" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-red-600">초기화</p>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* 파일 관리 모달 */}
      <Dialog open={fileManagementOpen} onOpenChange={setFileManagementOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-md mx-auto rounded-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold tracking-tight text-slate-900">
              업로드 파일 관리
            </DialogTitle>
            <DialogDescription className="sr-only">
              업로드한 파일 목록을 확인하고 삭제할 수 있습니다.
            </DialogDescription>
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
            <DialogDescription className="sr-only">
              자동 분류 규칙을 확인하고 수정합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto -mx-6 px-6">
            <MappingsManagement />
          </div>
        </DialogContent>
      </Dialog>

      {/* iOS 설치 안내 다이얼로그 */}
      <Dialog open={iosGuideOpen} onOpenChange={setIosGuideOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-sm mx-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-[#3182F6]" />
              앱 설치 방법
            </DialogTitle>
            <DialogDescription className="sr-only">
              iOS에서 홈 화면에 앱을 추가하는 방법을 안내합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-slate-600">
              Safari 브라우저에서 다음 단계를 따라해주세요:
            </p>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                <div className="w-7 h-7 rounded-full bg-[#3182F6] text-white flex items-center justify-center text-sm font-bold shrink-0">1</div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">공유 버튼 탭</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    화면 하단의 <Share className="w-3.5 h-3.5 inline text-[#3182F6]" /> 아이콘을 탭하세요
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                <div className="w-7 h-7 rounded-full bg-[#3182F6] text-white flex items-center justify-center text-sm font-bold shrink-0">2</div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">홈 화면에 추가</p>
                  <p className="text-xs text-slate-500 mt-0.5">스크롤하여 &quot;홈 화면에 추가&quot;를 탭하세요</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                <div className="w-7 h-7 rounded-full bg-[#3182F6] text-white flex items-center justify-center text-sm font-bold shrink-0">3</div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">추가 완료</p>
                  <p className="text-xs text-slate-500 mt-0.5">오른쪽 상단의 &quot;추가&quot;를 탭하면 완료!</p>
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
            <DialogDescription className="sr-only">
              데스크톱 또는 안드로이드에서 설치하는 방법을 안내합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-slate-600">
              브라우저에서 앱으로 설치할 수 있습니다:
            </p>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                <div className="w-7 h-7 rounded-full bg-[#3182F6] text-white flex items-center justify-center text-sm font-bold shrink-0">1</div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">주소창 확인</p>
                  <p className="text-xs text-slate-500 mt-0.5">주소창 오른쪽에 설치 아이콘 (⊕ 또는 📥)이 있습니다</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                <div className="w-7 h-7 rounded-full bg-[#3182F6] text-white flex items-center justify-center text-sm font-bold shrink-0">2</div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">설치 클릭</p>
                  <p className="text-xs text-slate-500 mt-0.5">아이콘을 클릭하고 &quot;설치&quot;를 선택하세요</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">Android 모바일</p>
                  <p className="text-xs text-slate-500 mt-0.5">Chrome 메뉴(⋮) → &quot;홈 화면에 추가&quot;를 선택하세요</p>
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

      {/* 공유 초기화 다이얼로그 */}
      <ResetConfirmDialog
        open={resetDialogOpen}
        onOpenChange={setResetDialogOpen}
      />

      {/* 변경 히스토리 모달 */}
      <HistoryModal open={historyModalOpen} onOpenChange={setHistoryModalOpen} />
    </>
  );
}
