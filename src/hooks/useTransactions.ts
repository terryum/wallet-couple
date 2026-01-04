/**
 * 거래 내역 관련 React Query 훅
 */

'use client';

import { useEffect, useCallback } from 'react';
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  Transaction,
  TransactionQueryParams,
  UpdateTransactionDto,
  CreateTransactionDto,
  Category,
} from '@/types';
import { getAdjacentMonth } from '@/lib/utils/date';

/** 페이지네이션 정보 */
interface PaginationInfo {
  totalCount: number;
  hasMore: boolean;
  limit?: number;
  offset: number;
}

/** 거래 내역 조회 응답 타입 */
interface TransactionsResponse {
  success: boolean;
  data: Transaction[];
  count: number;
  month: string;
  summary?: {
    total: number;
    totalCount: number;
    byCategory: { category: Category; total_amount: number }[];
  };
  pagination?: PaginationInfo;
  error?: string;
}

/** 거래 내역 조회 파라미터 */
interface FetchTransactionsParams extends TransactionQueryParams {
  includeSummary?: boolean;
  limit?: number;
  offset?: number;
}

/** 거래 내역 조회 */
async function fetchTransactions(
  params: FetchTransactionsParams
): Promise<TransactionsResponse> {
  const searchParams = new URLSearchParams();
  searchParams.set('month', params.month);
  if (params.sort) searchParams.set('sort', params.sort);
  if (params.category) searchParams.set('category', params.category);
  if (params.owner) searchParams.set('owner', params.owner);
  if (params.includeSummary) searchParams.set('include_summary', 'true');
  if (params.transactionType) searchParams.set('transaction_type', params.transactionType);
  if (params.limit !== undefined) searchParams.set('limit', String(params.limit));
  if (params.offset !== undefined) searchParams.set('offset', String(params.offset));

  const res = await fetch(`/api/transactions?${searchParams.toString()}`);
  if (!res.ok) {
    throw new Error('거래 내역을 불러오는데 실패했습니다.');
  }
  return res.json();
}

/** 거래 내역 수정 */
async function updateTransaction(
  id: string,
  data: UpdateTransactionDto
): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(`/api/transactions/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();

  if (!json.success) {
    throw new Error(json.error || '수정 실패');
  }

  return json;
}

/** 거래 내역 삭제 (soft delete) */
async function deleteTransaction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(`/api/transactions/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_deleted: true }),
  });
  const json = await res.json();

  if (!json.success) {
    throw new Error(json.error || '삭제 실패');
  }

  return json;
}

/** 거래 내역 생성 */
async function createTransaction(
  data: CreateTransactionDto
): Promise<{ success: boolean; data?: Transaction; error?: string }> {
  const res = await fetch('/api/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();

  if (!json.success) {
    throw new Error(json.error || '추가 실패');
  }

  return json;
}

/** 거래 내역 조회 훅 옵션 */
interface UseTransactionsOptions {
  enabled?: boolean;
  prefetch?: boolean;
}

/** 거래 내역 조회 훅 (인접 월 프리페칭 포함) */
export function useTransactions(
  params: TransactionQueryParams & { includeSummary?: boolean },
  options?: UseTransactionsOptions
) {
  const queryClient = useQueryClient();
  const enabled = options?.enabled ?? true;
  const prefetch = options?.prefetch ?? true;

  // 인접 월 프리페칭 (enabled일 때만)
  useEffect(() => {
    if (!enabled || !prefetch) return;

    const prefetchMonth = (month: string) => {
      const prefetchParams = { ...params, month };
      queryClient.prefetchQuery({
        queryKey: ['transactions', prefetchParams],
        queryFn: () => fetchTransactions(prefetchParams),
        staleTime: 1000 * 60 * 5,
      });
    };

    // 이전/다음 월 미리 로드
    const prevMonth = getAdjacentMonth(params.month, -1);
    const nextMonth = getAdjacentMonth(params.month, 1);

    prefetchMonth(prevMonth);
    prefetchMonth(nextMonth);
  }, [params.month, params.owner, params.category, params.includeSummary, queryClient, enabled, prefetch, params]);

  return useQuery({
    queryKey: ['transactions', params],
    queryFn: () => fetchTransactions(params),
    staleTime: 1000 * 60 * 5, // 5분
    placeholderData: (previousData) => previousData, // 로딩 중 이전 데이터 유지
    enabled, // 팝업 열릴 때만 fetch
  });
}

/** 거래 내역 수정 훅 */
export function useUpdateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTransactionDto }) =>
      updateTransaction(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

/** 거래 내역 삭제 훅 */
export function useDeleteTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteTransaction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

/** 거래 내역 생성 훅 */
export function useCreateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTransactionDto) => createTransaction(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

// ============================================
// 무한 스크롤용 훅
// ============================================

/** 무한 스크롤 옵션 */
interface UseInfiniteTransactionsOptions {
  enabled?: boolean;
  /** 페이지당 로드 건수 (기본: 50) */
  pageSize?: number;
}

/** 무한 스크롤 거래 내역 조회 훅 */
export function useInfiniteTransactions(
  params: Omit<TransactionQueryParams, 'limit' | 'offset'> & { includeSummary?: boolean },
  options?: UseInfiniteTransactionsOptions
) {
  const enabled = options?.enabled ?? true;
  const pageSize = options?.pageSize ?? 50;

  const query = useInfiniteQuery({
    queryKey: ['transactions', 'infinite', params],
    queryFn: async ({ pageParam = 0 }) => {
      return fetchTransactions({
        ...params,
        limit: pageSize,
        offset: pageParam,
      });
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      const pagination = lastPage.pagination;
      if (!pagination || !pagination.hasMore) {
        return undefined;
      }
      return pagination.offset + (pagination.limit || pageSize);
    },
    staleTime: 1000 * 60 * 5,
    enabled,
  });

  // 모든 페이지의 거래 내역을 하나의 배열로 합치기
  const allTransactions = query.data?.pages.flatMap((page) => page.data) ?? [];

  // 첫 번째 페이지의 summary 사용
  const summary = query.data?.pages[0]?.summary ?? null;

  // 전체 건수 (첫 번째 페이지의 pagination에서 가져옴)
  const totalCount = query.data?.pages[0]?.pagination?.totalCount ?? 0;

  // loadMore 함수
  const loadMore = useCallback(() => {
    if (query.hasNextPage && !query.isFetchingNextPage) {
      query.fetchNextPage();
    }
  }, [query]);

  return {
    data: allTransactions,
    summary,
    totalCount,
    isLoading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage ?? false,
    loadMore,
    refetch: query.refetch,
  };
}
