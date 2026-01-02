/**
 * 소득/지출 요약 카드 컴포넌트
 * 드롭다운으로 세부 카테고리별 금액 표시
 */

'use client';

import { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { formatNumber } from '@/lib/utils/format';
import type { Transaction } from '@/types';

interface SummaryCardProps {
  transactions: Transaction[];
  prevMonthTransactions: Transaction[];
}

/** 만원 단위로 포맷팅 (+12만, -5만) */
function formatDiffInMan(diff: number): string {
  const absMan = Math.abs(Math.round(diff / 10000));
  if (absMan === 0) return '';
  const sign = diff > 0 ? '+' : '-';
  return `(${sign}${absMan}만)`;
}

/** 소득 변동 색상: 증가=파랑, 감소=빨강 */
function getIncomeDiffColor(diff: number): string {
  if (diff > 0) return 'text-blue-500';
  if (diff < 0) return 'text-red-500';
  return 'text-slate-400';
}

/** 지출 변동 색상: 증가=빨강, 감소=파랑 (반대) */
function getExpenseDiffColor(diff: number): string {
  if (diff > 0) return 'text-red-500';
  if (diff < 0) return 'text-blue-500';
  return 'text-slate-400';
}

export function SummaryCard({ transactions, prevMonthTransactions }: SummaryCardProps) {
  const [incomeExpanded, setIncomeExpanded] = useState(false);
  const [expenseExpanded, setExpenseExpanded] = useState(false);

  // 소득 집계
  const incomeData = useMemo(() => {
    const incomeTransactions = transactions.filter((t) => t.transaction_type === 'income');
    const prevIncomeTransactions = prevMonthTransactions.filter((t) => t.transaction_type === 'income');

    // 총 소득
    const total = incomeTransactions.reduce((sum, t) => sum + t.amount, 0);
    const prevTotal = prevIncomeTransactions.reduce((sum, t) => sum + t.amount, 0);

    // 1) 급여/상여
    const salaryBonus = incomeTransactions
      .filter((t) => t.category === '급여' || t.category === '상여')
      .reduce((sum, t) => sum + t.amount, 0);
    const prevSalaryBonus = prevIncomeTransactions
      .filter((t) => t.category === '급여' || t.category === '상여')
      .reduce((sum, t) => sum + t.amount, 0);

    // 2) 강연/도서
    const lecture = incomeTransactions
      .filter((t) => t.category === '강연/도서')
      .reduce((sum, t) => sum + t.amount, 0);
    const prevLecture = prevIncomeTransactions
      .filter((t) => t.category === '강연/도서')
      .reduce((sum, t) => sum + t.amount, 0);

    // 3) 기타 (정부/환급, 금융소득, 기타소득)
    const etc = incomeTransactions
      .filter((t) => t.category === '정부/환급' || t.category === '금융소득' || t.category === '기타소득')
      .reduce((sum, t) => sum + t.amount, 0);
    const prevEtc = prevIncomeTransactions
      .filter((t) => t.category === '정부/환급' || t.category === '금융소득' || t.category === '기타소득')
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      total,
      prevTotal,
      diff: total - prevTotal,
      items: [
        { label: '급여/상여', amount: salaryBonus, diff: salaryBonus - prevSalaryBonus },
        { label: '강연/도서', amount: lecture, diff: lecture - prevLecture },
        { label: 'etc.', amount: etc, diff: etc - prevEtc },
      ],
    };
  }, [transactions, prevMonthTransactions]);

  // 지출 집계
  const expenseData = useMemo(() => {
    const expenseTransactions = transactions.filter((t) => t.transaction_type !== 'income');
    const prevExpenseTransactions = prevMonthTransactions.filter((t) => t.transaction_type !== 'income');

    // 총 지출
    const total = expenseTransactions.reduce((sum, t) => sum + t.amount, 0);
    const prevTotal = prevExpenseTransactions.reduce((sum, t) => sum + t.amount, 0);

    // 2) 부모/육아: 부모님 + 육아
    const parentChild = expenseTransactions
      .filter((t) => t.category === '부모님' || t.category === '육아')
      .reduce((sum, t) => sum + t.amount, 0);
    const prevParentChild = prevExpenseTransactions
      .filter((t) => t.category === '부모님' || t.category === '육아')
      .reduce((sum, t) => sum + t.amount, 0);

    // 3) 고정비: 관리비 + 양육비 + 대출이자
    const fixedCost = expenseTransactions
      .filter((t) => t.category === '관리비' || t.category === '양육비' || t.category === '대출이자')
      .reduce((sum, t) => sum + t.amount, 0);
    const prevFixedCost = prevExpenseTransactions
      .filter((t) => t.category === '관리비' || t.category === '양육비' || t.category === '대출이자')
      .reduce((sum, t) => sum + t.amount, 0);

    // 1) 일반소비: 나머지 전부
    const generalCategories = ['부모님', '육아', '관리비', '양육비', '대출이자'];
    const general = expenseTransactions
      .filter((t) => !generalCategories.includes(t.category))
      .reduce((sum, t) => sum + t.amount, 0);
    const prevGeneral = prevExpenseTransactions
      .filter((t) => !generalCategories.includes(t.category))
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      total,
      prevTotal,
      diff: total - prevTotal,
      items: [
        { label: '일반소비', amount: general, diff: general - prevGeneral },
        { label: '부모/육아', amount: parentChild, diff: parentChild - prevParentChild },
        { label: '고정비', amount: fixedCost, diff: fixedCost - prevFixedCost },
      ],
    };
  }, [transactions, prevMonthTransactions]);

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {/* 소득 섹션 */}
      <div
        className="p-4 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={() => setIncomeExpanded(!incomeExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-blue-600">이번 달 총 소득</span>
            {incomeExpanded ? (
              <ChevronUp className="w-4 h-4 text-blue-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-blue-400" />
            )}
          </div>
          <div className="flex items-baseline">
            <span className="text-lg font-bold tracking-tight text-slate-900 tabular-nums text-right w-28">
              {formatNumber(incomeData.total)}
            </span>
            <span className="text-lg font-bold tracking-tight text-slate-900 w-5 text-left">원</span>
            <span className={`text-xs w-20 text-right whitespace-nowrap ${incomeData.diff !== 0 ? getIncomeDiffColor(incomeData.diff) : 'text-transparent'}`}>
              {incomeData.diff !== 0 ? formatDiffInMan(incomeData.diff) : '-'}
            </span>
          </div>
        </div>

        {/* 소득 드롭다운 */}
        {incomeExpanded && (
          <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
            {incomeData.items.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between pl-4">
                <span className="text-xs text-slate-500">{item.label}</span>
                <div className="flex items-baseline">
                  <span className="text-sm font-medium text-slate-700 tabular-nums text-right w-24">
                    {formatNumber(item.amount)}
                  </span>
                  <span className="text-sm font-medium text-slate-700 w-4 text-left">원</span>
                  <span className={`text-[10px] w-16 text-right whitespace-nowrap ${item.diff !== 0 ? getIncomeDiffColor(item.diff) : 'text-transparent'}`}>
                    {item.diff !== 0 ? formatDiffInMan(item.diff) : '-'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 구분선 */}
      <div className="h-px bg-slate-100" />

      {/* 지출 섹션 */}
      <div
        className="p-4 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={() => setExpenseExpanded(!expenseExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-red-500">이번 달 총 지출</span>
            {expenseExpanded ? (
              <ChevronUp className="w-4 h-4 text-red-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-red-400" />
            )}
          </div>
          <div className="flex items-baseline">
            <span className="text-lg font-bold tracking-tight text-slate-900 tabular-nums text-right w-28">
              {formatNumber(expenseData.total)}
            </span>
            <span className="text-lg font-bold tracking-tight text-slate-900 w-5 text-left">원</span>
            <span className={`text-xs w-20 text-right whitespace-nowrap ${expenseData.diff !== 0 ? getExpenseDiffColor(expenseData.diff) : 'text-transparent'}`}>
              {expenseData.diff !== 0 ? formatDiffInMan(expenseData.diff) : '-'}
            </span>
          </div>
        </div>

        {/* 지출 드롭다운 */}
        {expenseExpanded && (
          <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
            {expenseData.items.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between pl-4">
                <span className="text-xs text-slate-500">{item.label}</span>
                <div className="flex items-baseline">
                  <span className="text-sm font-medium text-slate-700 tabular-nums text-right w-24">
                    {formatNumber(item.amount)}
                  </span>
                  <span className="text-sm font-medium text-slate-700 w-4 text-left">원</span>
                  <span className={`text-[10px] w-16 text-right whitespace-nowrap ${item.diff !== 0 ? getExpenseDiffColor(item.diff) : 'text-transparent'}`}>
                    {item.diff !== 0 ? formatDiffInMan(item.diff) : '-'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
