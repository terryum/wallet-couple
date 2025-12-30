/**
 * 거래 내역 개별 행 컴포넌트
 * Design System: Apple/Clean Style
 */

'use client';

import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatShortDate, formatNumber } from '@/lib/utils/format';
import type { Transaction, Category } from '@/types';

/** 카테고리별 배지 색상 - Design System 적용 */
const CATEGORY_COLORS: Record<Category, string> = {
  // 지출 카테고리
  식료품: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
  '외식/커피': 'bg-orange-50 text-orange-700 hover:bg-orange-100',
  쇼핑: 'bg-pink-50 text-pink-700 hover:bg-pink-100',
  관리비: 'bg-slate-100 text-slate-700 hover:bg-slate-200',
  '통신/교통': 'bg-blue-50 text-blue-700 hover:bg-blue-100',
  육아: 'bg-amber-50 text-amber-700 hover:bg-amber-100',
  '병원/미용': 'bg-violet-50 text-violet-700 hover:bg-violet-100',
  기존할부: 'bg-rose-50 text-rose-700 hover:bg-rose-100',
  이자: 'bg-red-50 text-red-700 hover:bg-red-100',
  양육비: 'bg-teal-50 text-teal-700 hover:bg-teal-100',
  여행: 'bg-cyan-50 text-cyan-700 hover:bg-cyan-100',
  부모님: 'bg-amber-50 text-amber-700 hover:bg-amber-100',
  '친구/동료': 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100',
  '경조사/선물': 'bg-rose-50 text-rose-700 hover:bg-rose-100',
  '가전/가구': 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
  기타: 'bg-slate-50 text-slate-600 hover:bg-slate-100',
  // 소득 카테고리 (녹색 계열)
  급여: 'bg-green-100 text-green-800 hover:bg-green-200',
  상여: 'bg-green-50 text-green-700 hover:bg-green-100',
  '정부/환급': 'bg-lime-50 text-lime-700 hover:bg-lime-100',
  '강연/도서': 'bg-teal-100 text-teal-800 hover:bg-teal-200',
  금융소득: 'bg-cyan-100 text-cyan-800 hover:bg-cyan-200',
  기타소득: 'bg-green-50 text-green-600 hover:bg-green-100',
};

interface TransactionRowProps {
  transaction: Transaction;
  onCategoryClick?: (transaction: Transaction) => void;
  onLongPress?: (transaction: Transaction) => void;
  onDelete?: (transaction: Transaction) => void;
}

export function TransactionRow({
  transaction,
  onCategoryClick,
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

      {/* 카테고리 뱃지 - 타이트하게 */}
      <Badge
        variant="secondary"
        className={`shrink-0 cursor-pointer text-[10px] px-1.5 py-0.5 rounded-md font-medium transition-all ${categoryColor}`}
        onClick={(e) => {
          e.stopPropagation();
          onCategoryClick?.(transaction);
        }}
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
