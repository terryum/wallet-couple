/**
 * 모달 뒤로가기 핸들러 훅
 * 모달이 열렸을 때 뒤로가기 버튼으로 모달을 닫도록 처리
 */

'use client';

import { useEffect, useCallback, useRef } from 'react';

interface UseModalBackHandlerOptions {
  /** 모달 열림 상태 */
  isOpen: boolean;
  /** 모달 닫기 함수 */
  onClose: () => void;
  /** 모달 고유 ID (여러 모달 구분용) */
  modalId: string;
}

/**
 * 모달 뒤로가기 핸들러
 * - 모달이 열리면 history state를 push
 * - 뒤로가기 버튼 누르면 모달을 닫음 (페이지 이동 없음)
 */
export function useModalBackHandler({
  isOpen,
  onClose,
  modalId,
}: UseModalBackHandlerOptions) {
  const isHandlingBack = useRef(false);
  const historyPushed = useRef(false);

  // 뒤로가기 이벤트 핸들러
  const handlePopState = useCallback(
    (event: PopStateEvent) => {
      // 이 모달의 state인지 확인
      const state = event.state as { modalId?: string } | null;

      // 모달이 열려있고, 뒤로가기로 인해 state가 사라졌으면 모달 닫기
      if (isOpen && historyPushed.current && state?.modalId !== modalId) {
        isHandlingBack.current = true;
        historyPushed.current = false;
        onClose();
      }
    },
    [isOpen, onClose, modalId]
  );

  useEffect(() => {
    if (isOpen) {
      // 모달이 열리면 history state push
      if (!historyPushed.current) {
        window.history.pushState({ modalId }, '', window.location.href);
        historyPushed.current = true;
      }

      // popstate 이벤트 리스너 등록
      window.addEventListener('popstate', handlePopState);

      return () => {
        window.removeEventListener('popstate', handlePopState);
      };
    } else {
      // 모달이 닫힐 때
      if (historyPushed.current && !isHandlingBack.current) {
        // 뒤로가기가 아닌 다른 방법으로 닫힌 경우 (X 버튼, 배경 클릭 등)
        // history를 정리
        window.history.back();
      }
      historyPushed.current = false;
      isHandlingBack.current = false;
    }
  }, [isOpen, modalId, handlePopState]);
}
