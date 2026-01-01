/**
 * 업로드된 파일 관리 훅
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UploadedFile } from '@/lib/supabase/queries';
import type { Owner } from '@/types';

interface FilesResponse {
  success: boolean;
  data?: UploadedFile[];
  error?: string;
}

interface DeleteResponse {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * 업로드된 파일 목록 조회
 */
export function useUploadedFiles() {
  return useQuery<UploadedFile[]>({
    queryKey: ['uploadedFiles'],
    queryFn: async () => {
      const res = await fetch('/api/files');
      const data: FilesResponse = await res.json();
      if (!data.success) {
        throw new Error(data.error || '파일 목록 조회 실패');
      }
      return data.data || [];
    },
  });
}

/**
 * 개별 파일 삭제
 */
export function useDeleteFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (fileId: string) => {
      const res = await fetch(`/api/files/${fileId}`, {
        method: 'DELETE',
      });
      const data: DeleteResponse = await res.json();
      if (!data.success) {
        throw new Error(data.error || '파일 삭제 실패');
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['uploadedFiles'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['billing-comparison'] });
    },
  });
}

/**
 * 모든 파일 삭제 (전체 초기화)
 * @param preserveMappings - true인 경우 이름/카테고리 매핑 유지
 */
export function useDeleteAllFiles() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (preserveMappings: boolean = false) => {
      const url = preserveMappings
        ? '/api/files?preserveMappings=true'
        : '/api/files';
      const res = await fetch(url, {
        method: 'DELETE',
      });
      const data: DeleteResponse = await res.json();
      if (!data.success) {
        throw new Error(data.error || '전체 삭제 실패');
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['uploadedFiles'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['billing-comparison'] });
    },
  });
}

/**
 * 전체 초기화 (모든 데이터 삭제)
 * @param preserveCustomizations - true인 경우 사용자 커스텀 설정 유지
 *   (카테고리 매핑, 이용처명 매핑 등 - registry.ts에 등록된 모든 항목)
 */
export function useResetAllData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (preserveCustomizations: boolean = false) => {
      const url = preserveCustomizations
        ? '/api/reset?preserveCustomizations=true'
        : '/api/reset';
      const res = await fetch(url, {
        method: 'DELETE',
      });
      const data: DeleteResponse = await res.json();
      if (!data.success) {
        throw new Error(data.error || '초기화 실패');
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['uploadedFiles'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['billing-comparison'] });
    },
  });
}

interface ManualEntryCountResponse {
  success: boolean;
  data?: { husband: number; wife: number };
  error?: string;
}

/**
 * 직접입력 내역 수 조회
 */
export function useManualEntryCounts() {
  return useQuery<{ husband: number; wife: number }>({
    queryKey: ['manualEntryCounts'],
    queryFn: async () => {
      const res = await fetch('/api/manual-entries/counts');
      const data: ManualEntryCountResponse = await res.json();
      if (!data.success) {
        throw new Error(data.error || '직접입력 내역 수 조회 실패');
      }
      return data.data || { husband: 0, wife: 0 };
    },
  });
}
