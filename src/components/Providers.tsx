/**
 * 애플리케이션 전역 프로바이더
 * - QueryClient 설정
 * - AppContext 제공
 * - 앱 초기 로드 시 데이터 프리페칭
 */

'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { AppProvider } from '@/contexts/AppContext';
import { DataPrefetcher } from './DataPrefetcher';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5분
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <DataPrefetcher />
        {children}
      </AppProvider>
    </QueryClientProvider>
  );
}
