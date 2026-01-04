/**
 * 시간 관련 상수
 * setTimeout 지연, 애니메이션 등에 사용되는 매직 넘버 중앙화
 */

/**
 * 프리페칭 지연 시간 (ms)
 * DataPrefetcher에서 단계별 프리페칭에 사용
 */
export const PREFETCH_DELAY = {
  /** 즉시 실행 */
  IMMEDIATE: 0,
  /** 빠른 프리페칭 (100ms) */
  FAST: 100,
  /** 일반 프리페칭 (300ms) */
  NORMAL: 300,
  /** 느린 프리페칭 (500ms) */
  SLOW: 500,
  /** 백그라운드 프리페칭 (800ms) */
  BACKGROUND: 800,
} as const;

/**
 * UI 상호작용 지연 시간 (ms)
 */
export const UI_DELAY = {
  /** 스크롤 위치 복원 지연 */
  SCROLL_RESTORE: 100,
  /** 모달 오픈 지연 */
  MODAL_OPEN: 50,
  /** 디바운스 기본값 */
  DEBOUNCE_DEFAULT: 300,
  /** 애니메이션 기본값 */
  ANIMATION_DEFAULT: 200,
} as const;

/**
 * 차트 관련 상수
 */
export const CHART_TIMING = {
  /** 차트 애니메이션 지속 시간 */
  ANIMATION_DURATION: 300,
  /** 툴팁 지연 */
  TOOLTIP_DELAY: 100,
} as const;
