/**
 * iOS 스타일 스와이프/롱프레스 삭제 제스처를 지원하는 행 컴포넌트
 */

'use client';

import { useState, useRef, useCallback, type ReactNode } from 'react';
import { Trash2 } from 'lucide-react';

interface SwipeableRowProps {
  children: ReactNode;
  onDelete: () => void;
  onClick?: () => void;
  className?: string;
}

/** 스와이프 임계값 (픽셀) */
const SWIPE_THRESHOLD = 60;
/** 롱프레스 시간 (ms) */
const LONG_PRESS_DURATION = 500;
/** 삭제 버튼 너비 */
const DELETE_BUTTON_WIDTH = 72;

export function SwipeableRow({
  children,
  onDelete,
  onClick,
  className = '',
}: SwipeableRowProps) {
  // 스와이프 상태
  const [translateX, setTranslateX] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // 롱프레스 상태
  const [showDeleteOverlay, setShowDeleteOverlay] = useState(false);

  // 터치 추적
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchCurrentX = useRef(0);
  const isHorizontalSwipe = useRef<boolean | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasMoved = useRef(false);

  // 롱프레스 시작
  const startLongPress = useCallback(() => {
    longPressTimer.current = setTimeout(() => {
      if (!hasMoved.current) {
        setShowDeleteOverlay(true);
      }
    }, LONG_PRESS_DURATION);
  }, []);

  // 롱프레스 취소
  const cancelLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  // 터치 시작
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      touchStartX.current = touch.clientX;
      touchStartY.current = touch.clientY;
      touchCurrentX.current = touch.clientX;
      isHorizontalSwipe.current = null;
      hasMoved.current = false;

      // 이미 열려있으면 롱프레스 비활성화
      if (!isOpen) {
        startLongPress();
      }
    },
    [isOpen, startLongPress]
  );

  // 터치 이동
  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStartX.current;
      const deltaY = touch.clientY - touchStartY.current;

      // 첫 이동에서 스와이프 방향 결정
      if (isHorizontalSwipe.current === null) {
        if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
          isHorizontalSwipe.current = Math.abs(deltaX) > Math.abs(deltaY);
          hasMoved.current = true;
          cancelLongPress();
        }
      }

      // 수평 스와이프만 처리
      if (isHorizontalSwipe.current) {
        e.preventDefault();
        setIsDragging(true);
        touchCurrentX.current = touch.clientX;

        let newTranslateX: number;
        if (isOpen) {
          // 열린 상태에서 시작
          newTranslateX = -DELETE_BUTTON_WIDTH + deltaX;
        } else {
          // 닫힌 상태에서 시작
          newTranslateX = deltaX;
        }

        // 왼쪽으로만 스와이프 허용 (오른쪽 제한)
        newTranslateX = Math.min(0, Math.max(-DELETE_BUTTON_WIDTH - 20, newTranslateX));
        setTranslateX(newTranslateX);
      }
    },
    [isOpen, cancelLongPress]
  );

  // 터치 종료
  const handleTouchEnd = useCallback(() => {
    cancelLongPress();

    if (!isDragging) {
      // 드래그 없이 터치 종료 = 클릭
      if (!hasMoved.current && !showDeleteOverlay) {
        onClick?.();
      }
      return;
    }

    setIsDragging(false);

    // 스와이프 임계값 확인
    const deltaX = touchCurrentX.current - touchStartX.current;

    if (isOpen) {
      // 열린 상태에서
      if (deltaX > SWIPE_THRESHOLD / 2) {
        // 오른쪽으로 스와이프 → 닫기
        setTranslateX(0);
        setIsOpen(false);
      } else {
        // 다시 열기
        setTranslateX(-DELETE_BUTTON_WIDTH);
      }
    } else {
      // 닫힌 상태에서
      if (deltaX < -SWIPE_THRESHOLD) {
        // 왼쪽으로 스와이프 → 열기
        setTranslateX(-DELETE_BUTTON_WIDTH);
        setIsOpen(true);
      } else {
        // 닫기
        setTranslateX(0);
      }
    }
  }, [isDragging, isOpen, onClick, showDeleteOverlay, cancelLongPress]);

  // 삭제 확인
  const handleDeleteClick = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.stopPropagation();
      onDelete();
      setIsOpen(false);
      setTranslateX(0);
      setShowDeleteOverlay(false);
    },
    [onDelete]
  );

  // 롱프레스 오버레이 취소
  const handleOverlayCancel = useCallback(() => {
    setShowDeleteOverlay(false);
  }, []);

  // 바깥 터치로 닫기
  const handleOutsideTouch = useCallback(() => {
    if (isOpen) {
      setIsOpen(false);
      setTranslateX(0);
    }
  }, [isOpen]);

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* 삭제 버튼 배경 (스와이프용) */}
      <div
        className="absolute inset-y-0 right-0 flex items-center justify-end bg-red-500"
        style={{ width: DELETE_BUTTON_WIDTH + 20 }}
      >
        <button
          onClick={handleDeleteClick}
          className="flex items-center justify-center w-[72px] h-full text-white"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      {/* 메인 콘텐츠 */}
      <div
        className={`relative bg-slate-50 ${className}`}
        style={{
          transform: `translateX(${translateX}px)`,
          transition: isDragging ? 'none' : 'transform 0.2s ease-out',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={(e) => {
          if (!isDragging && !hasMoved.current && !showDeleteOverlay && !isOpen) {
            onClick?.();
          } else if (isOpen) {
            handleOutsideTouch();
          }
        }}
      >
        {children}
      </div>

      {/* 롱프레스 삭제 오버레이 */}
      {showDeleteOverlay && (
        <div
          className="absolute inset-0 bg-white/95 rounded-xl flex items-center justify-center gap-3 z-10 animate-in fade-in duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleOverlayCancel}
            className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleDeleteClick}
            className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors flex items-center gap-1.5"
          >
            <Trash2 className="w-4 h-4" />
            삭제
          </button>
        </div>
      )}
    </div>
  );
}
