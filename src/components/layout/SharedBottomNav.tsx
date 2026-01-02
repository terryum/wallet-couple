/**
 * 공통 하단 네비게이션 컴포넌트
 * 4탭 구조: 지출 | 소득 | 지출분석 | 소득분석
 * Design System: 토스 스타일 블루 기반
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart2, TrendingDown, TrendingUp } from 'lucide-react';
import { transaction } from '@/constants/colors';

// 거래 유형별 색상 (colors.ts에서 중앙 관리)
const EXPENSE_COLOR = transaction.expense; // #FF5252
const INCOME_COLOR = transaction.income;   // #00C853

interface NavTab {
  href: string;
  label: string;
  icon: React.ReactNode;
  activeColor: string;
}

export function SharedBottomNav() {
  const pathname = usePathname();

  const tabs: NavTab[] = [
    {
      href: '/',
      label: '지출',
      icon: <TrendingDown className="w-4 h-4" />,
      activeColor: EXPENSE_COLOR,
    },
    {
      href: '/income',
      label: '소득',
      icon: <TrendingUp className="w-4 h-4" />,
      activeColor: INCOME_COLOR,
    },
    {
      href: '/dashboard',
      label: '지출분석',
      icon: <BarChart2 className="w-4 h-4" />,
      activeColor: EXPENSE_COLOR,
    },
    {
      href: '/income/dashboard',
      label: '소득분석',
      icon: <BarChart2 className="w-4 h-4" />,
      activeColor: INCOME_COLOR,
    },
  ];

  const isActive = (href: string) => {
    // 모든 탭은 정확한 경로 매칭 사용
    return pathname === href;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-slate-200 z-40 pb-safe">
      <div className="max-w-lg mx-auto px-4 py-2">
        <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
          {tabs.map((tab) => {
            const active = isActive(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 rounded-lg transition-all ${
                  active ? 'bg-white shadow-sm' : 'text-slate-500'
                }`}
                style={active ? { color: tab.activeColor } : undefined}
              >
                {tab.icon}
                <span className={`text-xs ${active ? 'font-medium' : ''}`}>
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
