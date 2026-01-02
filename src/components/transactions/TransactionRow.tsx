/**
 * 거래 내역 개별 행 컴포넌트
 * Design System: 토스 스타일 블루 기반
 */

'use client';

import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatShortDate, formatNumber } from '@/lib/utils/format';
import { getBadgeColorClass } from '@/constants/colors';
import type { Transaction, Category } from '@/types';

/** 카테고리별 배지 색상 - 블루→퍼플→핑크→오렌지 (초록 제외) */
const CATEGORY_COLORS: Record<string, string> = {
  // 지출 카테고리 - 초록 계열 제외하여 소득과 구분
  관리비: 'bg-blue-50 text-blue-700',
  대출이자: 'bg-blue-100 text-blue-700',
  기존할부: 'bg-blue-100 text-blue-800',
  세금: 'bg-indigo-50 text-indigo-700',
  양육비: 'bg-indigo-50 text-indigo-600',
  식료품: 'bg-sky-50 text-sky-700',
  '외식/커피': 'bg-sky-50 text-sky-600',
  '통신/교통': 'bg-violet-50 text-violet-700',
  쇼핑: 'bg-violet-50 text-violet-600',
  '병원/미용': 'bg-purple-50 text-purple-700',
  육아: 'bg-purple-50 text-purple-600',
  여행: 'bg-pink-50 text-pink-700',
  부모님: 'bg-pink-50 text-pink-600',
  '친구/동료': 'bg-rose-50 text-rose-600',
  '경조사/선물': 'bg-orange-50 text-orange-700',
  '가전/가구': 'bg-orange-50 text-orange-600',
  기타: 'bg-slate-50 text-slate-500',
  // 소득 카테고리 (그린 계열 - 지출과 명확히 구분)
  급여: 'bg-emerald-100 text-emerald-700',
  상여: 'bg-emerald-50 text-emerald-600',
  '정부/환급': 'bg-emerald-50 text-emerald-500',
  '강연/도서': 'bg-emerald-50 text-emerald-500',
  금융소득: 'bg-emerald-50 text-emerald-500',
  기타소득: 'bg-emerald-50 text-emerald-400',
};

interface TransactionRowProps {
  transaction: Transaction;
  onLongPress?: (transaction: Transaction) => void;
  onDelete?: (transaction: Transaction) => void;
}

export function TransactionRow({
  transaction,
  onLongPress,
  onDelete,
}: TransactionRowProps) {
  const categoryColor =
    CATEGORY_COLORS[transaction.category] || CATEGORY_COLORS['기타'];

  // Long press 핸들링
  let pressTimer: ReturnType<typeof setTimeout> | null = null;

  const handleTouchStart = () => {
    pressTimer = setTimeout(() => {
      onLongPress?.(transaction);
    }, 500);
  };

  const handleTouchEnd = () => {
    if (pressTimer) {
      clearTimeout(pressTimer);
      pressTimer = null;
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    onLongPress?.(transaction);
  };

  // 짧은 클릭으로 편집 모달 열기
  const handleClick = () => {
    onLongPress?.(transaction);
  };

  return (
    <div
      className="relative flex items-center gap-2 px-4 py-3 bg-white border-b border-slate-100 active:bg-slate-50 transition-colors cursor-pointer group"
      onClick={handleClick}
    >
      {/* 삭제 버튼 (오른쪽 상단) */}
      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(transaction);
          }}
          className="absolute top-1.5 right-1.5 p-1 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
          title="삭제"
        >
          <X className="w-3 h-3" />
        </button>
      )}

      {/* 날짜 - 타이트하게 */}
      <span className="text-xs text-slate-400 shrink-0 w-10">
        {formatShortDate(transaction.transaction_date)}
      </span>

      {/* 이용처 - 최대 폭 */}
      <span className="flex-1 text-sm text-slate-900 truncate min-w-0 font-medium">
        {transaction.merchant_name}
      </span>

      {/* 카테고리 뱃지 */}
      <Badge
        variant="secondary"
        className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-md font-medium ${categoryColor}`}
      >
        {transaction.category}
      </Badge>

      {/* 금액 - 고정 폭 */}
      <span className="text-sm font-bold tracking-tight text-slate-900 text-right shrink-0 w-20">
        {formatNumber(transaction.amount)}
      </span>
    </div>
  );
}

export { CATEGORY_COLORS };
