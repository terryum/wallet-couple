/**
 * 앱 전역 상태 관리 Context
 * 월, Owner 선택 상태, 현재 사용자를 전역으로 관리
 */

'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { getLastMonth, getAdjacentMonth } from '@/lib/utils/date';
import { getPrefetchManager } from '@/lib/prefetch';
import type { Owner } from '@/types';

/** 탭 타입 */
export type TabType = 'expense' | 'income' | 'household' | 'investment';

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
  /** 현재 활성 탭 */
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  /** 사용자 액션 알림 (프리페칭 우선순위 조정) */
  notifyUserAction: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [selectedMonth, setSelectedMonth] = useState(getLastMonth);
  const [selectedOwner, setSelectedOwner] = useState<Owner | null>(null);
  const [currentUser, setCurrentUser] = useState<Owner>('husband');
  const [activeTab, setActiveTab] = useState<TabType>('expense');

  const goToPrevMonth = useCallback(() => {
    setSelectedMonth((m) => getAdjacentMonth(m, -1));
  }, []);

  const goToNextMonth = useCallback(() => {
    setSelectedMonth((m) => getAdjacentMonth(m, 1));
  }, []);

  // 사용자 액션 알림 - 프리페칭 일시 중단
  const notifyUserAction = useCallback(() => {
    const manager = getPrefetchManager();
    manager.notifyUserAction(500); // 500ms 동안 프리페칭 일시 중단
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
        activeTab,
        setActiveTab,
        notifyUserAction,
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
