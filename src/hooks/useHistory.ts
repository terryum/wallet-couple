/**
 * 액션 히스토리 관련 React Query 훅
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ActionHistory } from '@/types';

/** 히스토리 조회 응답 타입 */
interface HistoryResponse {
  success: boolean;
  data: ActionHistory[];
  count: number;
  error?: string;
}

/** 히스토리 조회 */
async function fetchHistory(limit: number = 10): Promise<HistoryResponse> {
  const res = await fetch(`/api/history?limit=${limit}`);
  if (!res.ok) {
    throw new Error('히스토리를 불러오는데 실패했습니다.');
  }
  return res.json();
}

/** 히스토리 되돌리기 */
async function undoHistory(
  historyId: string
): Promise<{ success: boolean; undone?: number; error?: string }> {
  const res = await fetch(`/api/history/${historyId}`, {
    method: 'POST',
  });
  const json = await res.json();

  if (!json.success) {
    throw new Error(json.error || '되돌리기 실패');
  }

  return json;
}

/** 히스토리 조회 훅 */
export function useActionHistory(limit: number = 10) {
  return useQuery({
    queryKey: ['action-history', limit],
    queryFn: () => fetchHistory(limit),
    staleTime: 1000 * 30, // 30초
  });
}

/** 히스토리 되돌리기 훅 */
export function useUndoHistory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (historyId: string) => undoHistory(historyId),
    onSuccess: () => {
      // 모든 관련 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: ['action-history'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['uploaded-files'] });
    },
  });
}
