/**
 * 앱 전역 상태 관리 Context
 * 월, Owner 선택 상태, 현재 사용자를 전역으로 관리
 */

'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { getLastMonth, getAdjacentMonth } from '@/lib/utils/date';
import type { Owner } from '@/types';

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
  const [selectedMonth, setSelectedMonth] = useState(getLastMonth);
  const [selectedOwner, setSelectedOwner] = useState<Owner | null>(null);
  const [currentUser, setCurrentUser] = useState<Owner>('husband');

  const goToPrevMonth = useCallback(() => {
    setSelectedMonth((m) => getAdjacentMonth(m, -1));
  }, []);

  const goToNextMonth = useCallback(() => {
    setSelectedMonth((m) => getAdjacentMonth(m, 1));
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
