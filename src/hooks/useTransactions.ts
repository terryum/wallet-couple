/**
 * 거래 내역 관련 React Query 훅
 */

'use client';

import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  Transaction,
  TransactionQueryParams,
  UpdateTransactionDto,
  CreateTransactionDto,
  Category,
} from '@/types';

/** 이전/다음 월 계산 */
function getAdjacentMonth(yearMonth: string, delta: number): string {
  const [year, month] = yearMonth.split('-').map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/** 거래 내역 조회 응답 타입 */
interface TransactionsResponse {
  success: boolean;
  data: Transaction[];
  count: number;
  month: string;
  summary?: {
    total: number;
    byCategory: { category: Category; total_amount: number }[];
  };
  error?: string;
}

/** 거래 내역 조회 */
async function fetchTransactions(
  params: TransactionQueryParams & { includeSummary?: boolean }
): Promise<TransactionsResponse> {
  const searchParams = new URLSearchParams();
  searchParams.set('month', params.month);
  if (params.sort) searchParams.set('sort', params.sort);
  if (params.category) searchParams.set('category', params.category);
  if (params.owner) searchParams.set('owner', params.owner);
  if (params.includeSummary) searchParams.set('include_summary', 'true');

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
