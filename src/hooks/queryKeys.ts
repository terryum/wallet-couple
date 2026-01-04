/**
 * React Query 키 팩토리
 * queryKey 일관성 확보 및 중앙화
 */

import type { Owner, TransactionType, Category } from '@/types';

/**
 * 거래 내역 관련 쿼리 키
 */
export const transactionKeys = {
  /** 모든 거래 관련 쿼리 */
  all: ['transactions'] as const,

  /** 거래 목록 쿼리 */
  lists: () => [...transactionKeys.all, 'list'] as const,

  /** 특정 조건의 거래 목록 */
  list: (params: {
    month: string;
    transactionType?: TransactionType;
    owner?: Owner | null;
    category?: Category;
    sort?: string;
  }) =>
    [
      ...transactionKeys.lists(),
      {
        month: params.month,
        transactionType: params.transactionType,
        owner: params.owner ?? undefined,
        category: params.category,
        sort: params.sort,
      },
    ] as const,

  /** 검색 쿼리 */
  search: (params: Record<string, unknown>) =>
    [...transactionKeys.all, 'search', params] as const,
} as const;

/**
 * 대시보드 관련 쿼리 키
 */
export const dashboardKeys = {
  /** 모든 대시보드 관련 쿼리 */
  all: ['dashboard'] as const,

  /** 월별 집계 */
  monthly: (month: string, owner?: Owner | null, transactionType?: TransactionType) =>
    [
      ...dashboardKeys.all,
      'monthly',
      month,
      owner ?? undefined,
      transactionType,
    ] as const,

  /** 추세 데이터 */
  trend: (
    monthCount: number,
    owner?: Owner | null,
    transactionType?: TransactionType,
    endMonth?: string
  ) =>
    [
      ...dashboardKeys.all,
      'trend',
      monthCount,
      owner ?? undefined,
      transactionType,
      endMonth,
    ] as const,

  /** 양쪽(소득+지출) 월별 집계 */
  monthlyBoth: (month: string, owner?: Owner | null) =>
    [...dashboardKeys.all, 'monthly-both', month, owner ?? undefined] as const,

  /** 양쪽(소득+지출) 추세 데이터 */
  trendBoth: (monthCount: number, owner?: Owner | null, endMonth?: string) =>
    [
      ...dashboardKeys.all,
      'trend-both',
      monthCount,
      owner ?? undefined,
      endMonth,
    ] as const,
} as const;

/**
 * 매핑 관련 쿼리 키
 */
export const mappingKeys = {
  all: ['mappings'] as const,
  categories: () => [...mappingKeys.all, 'categories'] as const,
  merchants: () => [...mappingKeys.all, 'merchants'] as const,
} as const;

/**
 * 파일 관련 쿼리 키
 */
export const fileKeys = {
  all: ['files'] as const,
  list: () => [...fileKeys.all, 'list'] as const,
} as const;

/**
 * 청구금액 비교 쿼리 키
 */
export const billingKeys = {
  all: ['billing'] as const,
  comparison: (months?: number) =>
    [...billingKeys.all, 'comparison', months] as const,
} as const;

/**
 * 모든 쿼리 키 (통합)
 */
export const queryKeys = {
  transactions: transactionKeys,
  dashboard: dashboardKeys,
  mappings: mappingKeys,
  files: fileKeys,
  billing: billingKeys,
} as const;
