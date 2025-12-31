/**
 * 거래 내역 리스트 컴포넌트
 * Design System: Apple/Clean Style
 */

'use client';

import { useState, useMemo } from 'react';
import { TransactionRow } from './TransactionRow';
import { Skeleton } from '@/components/ui/skeleton';
import { Upload, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import type { Transaction } from '@/types';

type SortColumn = 'date' | 'merchant' | 'category' | 'amount';
type SortDirection = 'asc' | 'desc';

interface TransactionListProps {
  transactions: Transaction[];
  isLoading?: boolean;
  onLongPress?: (transaction: Transaction) => void;
  onDelete?: (transaction: Transaction) => void;
  onUploadClick?: () => void;
}

/** 스켈레톤 로딩 UI */
function TransactionSkeleton() {
  return (
    <div className="flex items-center gap-4 px-5 py-4 bg-white border-b border-slate-100">
      <Skeleton className="w-12 h-4 rounded-lg" />
      <Skeleton className="flex-1 h-4 rounded-lg" />
      <Skeleton className="w-16 h-6 rounded-lg" />
      <Skeleton className="w-20 h-4 rounded-lg" />
    </div>
  );
}

/** 빈 상태 UI */
function EmptyState({ onUploadClick }: { onUploadClick?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-5">
        <Upload className="w-8 h-8 text-slate-400" />
      </div>
      <h3 className="text-lg font-bold tracking-tight text-slate-900 mb-2">
        내역이 없습니다
      </h3>
      <p className="text-sm text-slate-500 mb-6 leading-relaxed">
        카드 명세서를 업로드하여<br />
        지출 내역을 확인해보세요
      </p>
      {onUploadClick && (
        <button
          onClick={onUploadClick}
          className="h-12 px-6 bg-[#3182F6] text-white text-sm font-medium rounded-xl hover:bg-[#1B64DA] active:scale-[0.98] transition-all shadow-sm"
        >
          명세서 업로드
        </button>
      )}
    </div>
  );
}

/** 정렬 헤더 버튼 컴포넌트 */
function SortHeader({
  label,
  column,
  currentColumn,
  direction,
  onSort,
  className = '',
}: {
  label: string;
  column: SortColumn;
  currentColumn: SortColumn;
  direction: SortDirection;
  onSort: (column: SortColumn) => void;
  className?: string;
}) {
  const isActive = currentColumn === column;

  return (
    <button
      onClick={() => onSort(column)}
      className={`flex items-center gap-0.5 text-xs font-medium transition-colors ${
        isActive ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'
      } ${className}`}
    >
      {label}
      {isActive ? (
        direction === 'asc' ? (
          <ChevronUp className="w-3.5 h-3.5" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5" />
        )
      ) : (
        <ChevronsUpDown className="w-3.5 h-3.5 opacity-50" />
      )}
    </button>
  );
}

export function TransactionList({
  transactions,
  isLoading,
  onLongPress,
  onDelete,
  onUploadClick,
}: TransactionListProps) {
  // 정렬 상태
  const [sortColumn, setSortColumn] = useState<SortColumn>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // 정렬 핸들러
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      // 같은 컬럼 클릭 시 방향 전환
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      // 다른 컬럼 클릭 시 해당 컬럼으로 변경 (기본 내림차순)
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  // 정렬된 거래 내역
  const sortedTransactions = useMemo(() => {
    if (!transactions || transactions.length === 0) return [];

    return [...transactions].sort((a, b) => {
      let comparison = 0;

      switch (sortColumn) {
        case 'date':
          comparison = a.transaction_date.localeCompare(b.transaction_date);
          break;
        case 'merchant':
          comparison = a.merchant_name.localeCompare(b.merchant_name, 'ko');
          break;
        case 'category':
          comparison = a.category.localeCompare(b.category, 'ko');
          break;
        case 'amount':
          comparison = a.amount - b.amount;
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [transactions, sortColumn, sortDirection]);

  // 로딩 상태
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
        {Array.from({ length: 8 }).map((_, i) => (
          <TransactionSkeleton key={i} />
        ))}
      </div>
    );
  }

  // 빈 상태
  if (!transactions || transactions.length === 0) {
    return (
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
        <EmptyState onUploadClick={onUploadClick} />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
      {/* 정렬 헤더 */}
      <div className="flex items-center gap-2 px-5 py-3 bg-slate-50 border-b border-slate-100">
        <SortHeader
          label="날짜"
          column="date"
          currentColumn={sortColumn}
          direction={sortDirection}
          onSort={handleSort}
          className="w-12 justify-center"
        />
        <SortHeader
          label="이용처"
          column="merchant"
          currentColumn={sortColumn}
          direction={sortDirection}
          onSort={handleSort}
          className="flex-1 justify-center"
        />
        <SortHeader
          label="카테고리"
          column="category"
          currentColumn={sortColumn}
          direction={sortDirection}
          onSort={handleSort}
          className="justify-center"
        />
        <SortHeader
          label="금액"
          column="amount"
          currentColumn={sortColumn}
          direction={sortDirection}
          onSort={handleSort}
          className="w-20 justify-center"
        />
      </div>

      {/* 거래 내역 */}
      {sortedTransactions.map((transaction) => (
        <TransactionRow
          key={transaction.id}
          transaction={transaction}
          onLongPress={onLongPress}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
