/**
 * 공통 하단 네비게이션 컴포넌트
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart2 } from 'lucide-react';

export function SharedBottomNav() {
  const pathname = usePathname();
  const isHome = pathname === '/';
  const isDashboard = pathname === '/dashboard';

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-slate-200 z-40 pb-safe">
      <div className="max-w-lg mx-auto px-6 py-2">
        <div className="flex bg-slate-100 rounded-xl p-1">
          <Link
            href="/"
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg transition-all ${
              isHome
                ? 'bg-white shadow-sm text-[#3182F6]'
                : 'text-slate-500'
            }`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <span className={`text-sm ${isHome ? 'font-medium' : ''}`}>내역</span>
          </Link>
          <Link
            href="/dashboard"
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg transition-all ${
              isDashboard
                ? 'bg-white shadow-sm text-[#3182F6]'
                : 'text-slate-500'
            }`}
          >
            <BarChart2 className="w-5 h-5" />
            <span className={`text-sm ${isDashboard ? 'font-medium' : ''}`}>분석</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}
