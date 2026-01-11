/**
 * AI 인사이트 로컬 캐시
 * - localStorage 기반
 * - 데이터 해시로 변경 감지
 * - 기간별 독립 캐싱
 */

import type { Owner } from '@/types';

const PIE_CACHE_KEY_PREFIX = 'insight_pie_';
const TREND_CACHE_KEY_PREFIX = 'insight_trend_';
const CACHE_VERSION = 'v2';
const SESSION_START_KEY = 'insight_session_start';

// ============ 세션 관리 ============

/**
 * 현재 세션 시작 시간 가져오기 (없으면 생성)
 * - 새로고침/새 접속 시 sessionStorage 초기화 → 새 세션 시작
 * - 탭 이동 시 sessionStorage 유지 → 기존 세션 유지
 */
function getSessionStartTime(): number {
  if (typeof window === 'undefined') return 0;

  try {
    const stored = sessionStorage.getItem(SESSION_START_KEY);
    if (stored) {
      return parseInt(stored, 10);
    }
    // 새 세션 시작
    const now = Date.now();
    sessionStorage.setItem(SESSION_START_KEY, now.toString());
    return now;
  } catch {
    return Date.now();
  }
}

interface InsightCacheEntry {
  version: string;
  timestamp: number;
  insight: string;
  dataHash: string;
}

// ============ 캐시 키 생성 ============

function getPieCacheKey(month: string, owner?: Owner): string {
  const ownerPart = owner || 'all';
  return `${PIE_CACHE_KEY_PREFIX}${CACHE_VERSION}_${month}_${ownerPart}`;
}

function getTrendCacheKey(period: string, owner?: Owner): string {
  const ownerPart = owner || 'all';
  return `${TREND_CACHE_KEY_PREFIX}${CACHE_VERSION}_${period}_${ownerPart}`;
}

// ============ 데이터 해시 생성 ============

/**
 * 핵심 데이터로 해시 생성 (경미한 변화 무시)
 * - 만원 단위로 반올림
 * - 상위 5개 카테고리만 포함
 */
export function generateDataHash(data: {
  incomeTotal: number;
  expenseTotal: number;
  topCategories: string[];
}): string {
  const key = [
    Math.round(data.incomeTotal / 10000),
    Math.round(data.expenseTotal / 10000),
    data.topCategories.slice(0, 5).join(','),
  ].join('_');

  // btoa 대신 간단한 해시
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

// ============ 도넛차트 인사이트 캐시 ============

export function getCachedPieInsight(
  month: string,
  owner?: Owner,
  dataHash?: string
): string | null {
  if (typeof window === 'undefined') return null;

  try {
    const key = getPieCacheKey(month, owner);
    const cached = localStorage.getItem(key);
    if (!cached) return null;

    const entry: InsightCacheEntry = JSON.parse(cached);

    // 버전 체크
    if (entry.version !== CACHE_VERSION) {
      localStorage.removeItem(key);
      return null;
    }

    // 세션 체크: 새로고침/새 접속 시 캐시 무효화
    const sessionStart = getSessionStartTime();
    if (entry.timestamp < sessionStart) {
      return null;
    }

    // 데이터 해시 체크 (제공된 경우)
    if (dataHash && entry.dataHash !== dataHash) {
      return null;
    }

    return entry.insight;
  } catch {
    return null;
  }
}

export function setCachedPieInsight(
  month: string,
  owner: Owner | undefined,
  insight: string,
  dataHash: string
): void {
  if (typeof window === 'undefined') return;
  if (!insight) return;

  try {
    const key = getPieCacheKey(month, owner);
    const entry: InsightCacheEntry = {
      version: CACHE_VERSION,
      timestamp: Date.now(),
      insight,
      dataHash,
    };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // localStorage 용량 초과 등 무시
  }
}

// ============ 추세차트 인사이트 캐시 ============

export function getCachedTrendInsight(
  period: string,
  owner?: Owner,
  dataHash?: string
): string | null {
  if (typeof window === 'undefined') return null;

  try {
    const key = getTrendCacheKey(period, owner);
    const cached = localStorage.getItem(key);
    if (!cached) return null;

    const entry: InsightCacheEntry = JSON.parse(cached);

    // 버전 체크
    if (entry.version !== CACHE_VERSION) {
      localStorage.removeItem(key);
      return null;
    }

    // 세션 체크: 새로고침/새 접속 시 캐시 무효화
    const sessionStart = getSessionStartTime();
    if (entry.timestamp < sessionStart) {
      return null;
    }

    // 데이터 해시 체크 (제공된 경우)
    if (dataHash && entry.dataHash !== dataHash) {
      return null;
    }

    return entry.insight;
  } catch {
    return null;
  }
}

export function setCachedTrendInsight(
  period: string,
  owner: Owner | undefined,
  insight: string,
  dataHash: string
): void {
  if (typeof window === 'undefined') return;
  if (!insight) return;

  try {
    const key = getTrendCacheKey(period, owner);
    const entry: InsightCacheEntry = {
      version: CACHE_VERSION,
      timestamp: Date.now(),
      insight,
      dataHash,
    };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // localStorage 용량 초과 등 무시
  }
}

// ============ 캐시 무효화 ============

/**
 * 모든 인사이트 캐시 삭제 (데이터 업로드/수정 시)
 */
export function clearInsightCache(): void {
  if (typeof window === 'undefined') return;

  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key?.startsWith(PIE_CACHE_KEY_PREFIX) ||
        key?.startsWith(TREND_CACHE_KEY_PREFIX)
      ) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  } catch {
    // 무시
  }
}
