/**
 * 추세 데이터 로컬 캐시
 * - localStorage 기반 stale-while-revalidate 패턴
 * - 첫 로딩 시 캐시된 데이터 즉시 표시 → 백그라운드에서 갱신
 */

import type { CombinedMonthData } from '@/hooks/useDashboard';
import type { Owner } from '@/types';

const CACHE_KEY_PREFIX = 'trend_cache_';
const CACHE_VERSION = 'v1';

interface TrendCacheEntry {
  version: string;
  timestamp: number;
  data: CombinedMonthData[];
  monthCount: number;
}

function getCacheKey(monthCount: number, owner?: Owner): string {
  const ownerPart = owner || 'all';
  return `${CACHE_KEY_PREFIX}${CACHE_VERSION}_${monthCount}_${ownerPart}`;
}

/**
 * 캐시된 추세 데이터 조회
 */
export function getCachedTrendData(
  monthCount: number,
  owner?: Owner
): CombinedMonthData[] | null {
  if (typeof window === 'undefined') return null;

  try {
    const key = getCacheKey(monthCount, owner);
    const cached = localStorage.getItem(key);
    if (!cached) return null;

    const entry: TrendCacheEntry = JSON.parse(cached);

    // 버전 체크
    if (entry.version !== CACHE_VERSION) {
      localStorage.removeItem(key);
      return null;
    }

    return entry.data;
  } catch {
    return null;
  }
}

/**
 * 추세 데이터 캐시에 저장
 */
export function setCachedTrendData(
  monthCount: number,
  owner: Owner | undefined,
  data: CombinedMonthData[]
): void {
  if (typeof window === 'undefined') return;
  if (!data || data.length === 0) return;

  try {
    const key = getCacheKey(monthCount, owner);
    const entry: TrendCacheEntry = {
      version: CACHE_VERSION,
      timestamp: Date.now(),
      data,
      monthCount,
    };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // localStorage 용량 초과 등 무시
  }
}

/**
 * 모든 추세 캐시 삭제 (데이터 업로드/수정 시)
 */
export function clearTrendCache(): void {
  if (typeof window === 'undefined') return;

  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(CACHE_KEY_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  } catch {
    // 무시
  }
}
