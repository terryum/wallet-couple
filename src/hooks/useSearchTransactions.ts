/**
 * 거래 내역 검색 훅
 * React Query 기반 고급 검색
 */

import { useQuery } from '@tanstack/react-query';
import type {
  SearchFilters,
  TransactionSearchParams,
  SearchResult,
  Owner,
} from '@/types';

interface UseSearchTransactionsOptions {
  enabled?: boolean;
  currentMonth?: string; // YYYY-MM 형식
  owner?: Owner | null;
}

/**
 * SearchFilters를 API 파라미터로 변환
 */
function buildSearchParams(
  filters: SearchFilters,
  options: UseSearchTransactionsOptions
): TransactionSearchParams {
  const params: TransactionSearchParams = {
    transactionType: 'all',
    sort: 'date_desc',
  };

  // 기간 처리
  if (filters.periodType === 'current_month' && options.currentMonth) {
    // 현재 월의 시작일과 종료일 계산
    const [year, month] = options.currentMonth.split('-').map(Number);
    const lastDay = new Date(year, month, 0).getDate();
    params.startDate = `${options.currentMonth}-01`;
    params.endDate = `${options.currentMonth}-${String(lastDay).padStart(2, '0')}`;
  } else if (filters.periodType === 'custom' && filters.dateRange) {
    params.startDate = filters.dateRange.startDate;
    params.endDate = filters.dateRange.endDate;
  }
  // 'all'인 경우 startDate/endDate 없이 전체 조회

  // 이용처 검색
  if (filters.merchantSearch?.trim()) {
    params.merchantSearch = filters.merchantSearch.trim();
  }

  // 카테고리 필터 (복수)
  if (filters.categories && filters.categories.length > 0) {
    params.categories = filters.categories.join(',');
  }

  // 결제수단 필터 (복수)
  if (filters.sourceTypes && filters.sourceTypes.length > 0) {
    params.sourceTypes = filters.sourceTypes.join(',');
  }

  // 금액 범위
  if (filters.amountRange?.min !== undefined) {
    params.amountMin = filters.amountRange.min;
  }
  if (filters.amountRange?.max !== undefined) {
    params.amountMax = filters.amountRange.max;
  }

  // Owner 필터
  if (options.owner) {
    params.owner = options.owner;
  }

  return params;
}

/**
 * 검색 API 호출
 */
async function fetchSearchTransactions(
  params: TransactionSearchParams
): Promise<SearchResult> {
  const queryParams = new URLSearchParams();

  if (params.startDate) queryParams.set('startDate', params.startDate);
  if (params.endDate) queryParams.set('endDate', params.endDate);
  if (params.merchantSearch) queryParams.set('merchantSearch', params.merchantSearch);
  if (params.categories) queryParams.set('categories', params.categories);
  if (params.sourceTypes) queryParams.set('sourceTypes', params.sourceTypes);
  if (params.amountMin !== undefined)
    queryParams.set('amountMin', String(params.amountMin));
  if (params.amountMax !== undefined)
    queryParams.set('amountMax', String(params.amountMax));
  if (params.owner) queryParams.set('owner', params.owner);
  if (params.transactionType)
    queryParams.set('transactionType', params.transactionType);
  if (params.sort) queryParams.set('sort', params.sort);
  if (params.limit !== undefined) queryParams.set('limit', String(params.limit));
  if (params.offset !== undefined) queryParams.set('offset', String(params.offset));

  const response = await fetch(`/api/transactions/search?${queryParams.toString()}`);

  if (!response.ok) {
    throw new Error('검색 요청 실패');
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || '검색 실패');
  }

  return {
    data: result.data,
    count: result.count,
    hasMore: result.hasMore,
  };
}

/**
 * 검색 필터가 활성화되어 있는지 확인
 */
export function isSearchActive(filters: SearchFilters): boolean {
  // 기본 상태: periodType이 current_month이고 다른 필터 없음
  if (filters.periodType !== 'current_month') return true;
  if (filters.merchantSearch?.trim()) return true;
  if (filters.categories && filters.categories.length > 0) return true;
  if (filters.sourceTypes && filters.sourceTypes.length > 0) return true;
  if (filters.amountRange?.min !== undefined && filters.amountRange.min > 0)
    return true;
  if (filters.amountRange?.max !== undefined && filters.amountRange.max > 0)
    return true;

  return false;
}

/**
 * 활성화된 필터 개수 계산
 */
export function getActiveFilterCount(filters: SearchFilters): number {
  let count = 0;

  if (filters.periodType !== 'current_month') count++;
  if (filters.merchantSearch?.trim()) count++;
  if (filters.categories && filters.categories.length > 0) count++;
  if (filters.sourceTypes && filters.sourceTypes.length > 0) count++;
  if (
    (filters.amountRange?.min !== undefined && filters.amountRange.min > 0) ||
    (filters.amountRange?.max !== undefined && filters.amountRange.max > 0)
  )
    count++;

  return count;
}

/**
 * 기본 필터 상태
 */
export const DEFAULT_FILTERS: SearchFilters = {
  periodType: 'current_month',
};

/**
 * 거래 내역 검색 훅
 */
export function useSearchTransactions(
  filters: SearchFilters,
  options: UseSearchTransactionsOptions = {}
) {
  const { enabled = true, currentMonth, owner } = options;

  const params = buildSearchParams(filters, { currentMonth, owner });
  const searchActive = isSearchActive(filters);

  return useQuery({
    queryKey: ['transactions', 'search', params],
    queryFn: () => fetchSearchTransactions(params),
    enabled: enabled && searchActive,
    staleTime: 1000 * 60 * 5, // 5분
    gcTime: 1000 * 60 * 10, // 10분
  });
}
