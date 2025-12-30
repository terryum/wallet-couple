/**
 * PWA 설치 관련 훅
 * beforeinstallprompt 이벤트를 처리하고 앱 설치를 트리거합니다.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PWAInstallState {
  /** 설치 가능 여부 (beforeinstallprompt 이벤트 발생 여부) */
  isInstallable: boolean;
  /** 이미 설치되어 있는지 여부 (standalone 모드) */
  isInstalled: boolean;
  /** iOS Safari인지 여부 (수동 설치 필요) */
  isIOS: boolean;
  /** 설치 중인지 여부 */
  isInstalling: boolean;
  /** 클라이언트에서 마운트되었는지 여부 */
  isMounted: boolean;
}

interface UsePWAInstallReturn extends PWAInstallState {
  /** 앱 설치 프롬프트 표시 */
  promptInstall: () => Promise<boolean>;
}

export function usePWAInstall(): UsePWAInstallReturn {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [state, setState] = useState<PWAInstallState>({
    isInstallable: false,
    isInstalled: false,
    isIOS: false,
    isInstalling: false,
    isMounted: false,
  });

  useEffect(() => {
    // 클라이언트 사이드에서만 실행
    if (typeof window === 'undefined') return;

    // iOS 감지
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream;

    // standalone 모드 감지 (이미 설치됨)
    const isInstalled =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    setState((prev) => ({
      ...prev,
      isIOS,
      isInstalled,
      isMounted: true,
    }));

    // beforeinstallprompt 이벤트 리스너
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setState((prev) => ({ ...prev, isInstallable: true }));
    };

    // appinstalled 이벤트 리스너
    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setState((prev) => ({
        ...prev,
        isInstallable: false,
        isInstalled: true,
        isInstalling: false,
      }));
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) {
      return false;
    }

    setState((prev) => ({ ...prev, isInstalling: true }));

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setState((prev) => ({
          ...prev,
          isInstallable: false,
          isInstalling: false,
        }));
        return true;
      }
    } catch (error) {
      console.error('PWA 설치 오류:', error);
    }

    setState((prev) => ({ ...prev, isInstalling: false }));
    return false;
  }, [deferredPrompt]);

  return {
    ...state,
    promptInstall,
  };
}
