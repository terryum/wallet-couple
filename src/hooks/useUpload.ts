/**
 * 파일 업로드 관련 React Query 훅
 */

'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Owner } from '@/types';

/** 업로드 응답 타입 */
interface UploadResponse {
  success: boolean;
  message: string;
  results: {
    fileName: string;
    sourceType: string;
    parsed: number;
    inserted: number;
    duplicates: number;
    error?: string;
  }[];
  totalInserted: number;
  totalDuplicates: number;
}

/** 파일 업로드 */
async function uploadFiles(
  files: File[],
  owner: Owner
): Promise<UploadResponse> {
  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));
  formData.append('owner', owner);

  const res = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    throw new Error('파일 업로드에 실패했습니다.');
  }

  return res.json();
}

/** 파일 업로드 훅 */
export function useUpload() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ files, owner }: { files: File[]; owner: Owner }) =>
      uploadFiles(files, owner),
    onSuccess: () => {
      // 거래 내역 및 대시보드 캐시 모두 무효화
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
