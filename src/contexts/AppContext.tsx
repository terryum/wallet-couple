/**
 * 앱 전역 상태 관리 Context
 * 월, Owner 선택 상태, 현재 사용자를 전역으로 관리
 */

'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { Owner } from '@/types';

/** 현재 년월 가져오기 */
function getCurrentYearMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/** 이전/다음 월 계산 */
function adjustMonth(yearMonth: string, delta: number): string {
  const [year, month] = yearMonth.split('-').map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

interface AppContextType {
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  goToPrevMonth: () => void;
  goToNextMonth: () => void;
  selectedOwner: Owner | null;
  setSelectedOwner: (owner: Owner | null) => void;
  /** 현재 로그인된 사용자 */
  currentUser: Owner;
  setCurrentUser: (user: Owner) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentYearMonth);
  const [selectedOwner, setSelectedOwner] = useState<Owner | null>(null);
  const [currentUser, setCurrentUser] = useState<Owner>('husband');

  const goToPrevMonth = useCallback(() => {
    setSelectedMonth((m) => adjustMonth(m, -1));
  }, []);

  const goToNextMonth = useCallback(() => {
    setSelectedMonth((m) => adjustMonth(m, 1));
  }, []);

  return (
    <AppContext.Provider
      value={{
        selectedMonth,
        setSelectedMonth,
        goToPrevMonth,
        goToNextMonth,
        selectedOwner,
        setSelectedOwner,
        currentUser,
        setCurrentUser,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
}
