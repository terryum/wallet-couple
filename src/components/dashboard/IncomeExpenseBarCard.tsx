/**
 * 월별 소득/지출 변화 통합 차트
 *
 * 섹션 1: 소득/지출 분석
 *   - 소득 막대 (위) + 지출 막대 (아래) + 손익선
 *
 * 섹션 2: 카테고리 분석
 *   - 태그: [전체 지출] [카테고리들...] [전체 소득] [카테고리들...]
 *   - 선택된 항목의 막대 차트 (모두 위쪽 방향)
 */

'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import {
  ComposedChart,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatNumber, formatManwon } from '@/lib/utils/format';
import { transaction } from '@/constants/colors';
import { ALL_EXPENSE_CATEGORIES, INCOME_CATEGORIES, type Category } from '@/types';
import type { CombinedMonthData } from '@/hooks/useDashboard';

// 카테고리 선택 타입: 전체 또는 개별 카테고리
type CategorySelection =
  | { type: 'total'; transactionType: 'expense' | 'income' }
  | { type: 'category'; category: Category; transactionType: 'expense' | 'income' };

interface IncomeExpenseBarCardProps {
  data: CombinedMonthData[];
  isLoading?: boolean;
  headerMonth?: string;
  onMonthClick?: (month: string) => void;
  period?: string;
  onPeriodChange?: (period: string) => void;
}

type PresetPeriod = '3' | '6' | '12';

export function IncomeExpenseBarCard({
  data,
  isLoading,
  headerMonth,
  onMonthClick,
  period: externalPeriod,
  onPeriodChange,
}: IncomeExpenseBarCardProps) {
  const [internalPeriod, setInternalPeriod] = useState<string>('6');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customValue, setCustomValue] = useState('');
  const customInputRef = useRef<HTMLInputElement>(null);

  // 카테고리 분석용 상태 (기본값: 전체 지출)
  const [categorySelection, setCategorySelection] = useState<CategorySelection>({
    type: 'total',
    transactionType: 'expense',
  });

  // 외부에서 제어되면 외부 값 사용, 아니면 내부 상태 사용
  const period = externalPeriod || internalPeriod;
  const setPeriod = onPeriodChange || setInternalPeriod;

  // 직접입력 모드가 활성화되면 입력창에 포커스
  useEffect(() => {
    if (showCustomInput && customInputRef.current) {
      customInputRef.current.focus();
    }
  }, [showCustomInput]);

  // 직접입력 값 적용
  const handleCustomSubmit = () => {
    const num = parseInt(customValue);
    if (num >= 1 && num <= 24) {
      setPeriod(customValue);
      setShowCustomInput(false);
      setCustomValue('');
    }
  };

  // 미리 정의된 기간인지 확인
  const isPresetPeriod = ['3', '6', '12'].includes(period);

  // 기간에 따른 데이터 필터링 (확장 데이터 포함)
  const filteredData = useMemo(() => {
    const count = parseInt(period);
    const hasExtended = data.some((d) => d.isExtended);
    if (hasExtended) {
      return data.slice(-(count + 2));
    }
    return data.slice(-count);
  }, [data, period]);

  // 소득/지출 분석용 차트 데이터 (지출을 음수로)
  const mainChartData = useMemo(() => {
    return filteredData.map((d) => ({
      ...d,
      income: d.isExtended ? null : d.income,
      negativeExpense: d.isExtended ? null : -d.expense,
      balance: d.balance,
    }));
  }, [filteredData]);

  // 카테고리 분석용 차트 데이터
  const categoryChartData = useMemo(() => {
    return filteredData.map((d) => {
      let amount = 0;

      if (categorySelection.type === 'total') {
        // 전체 소득 또는 전체 지출
        amount = categorySelection.transactionType === 'income' ? d.income : d.expense;
      } else {
        // 개별 카테고리
        const categoryList = categorySelection.transactionType === 'income'
          ? d.incomeByCategory
          : d.expenseByCategory;
        const found = categoryList.find((c) => c.category === categorySelection.category);
        amount = found?.total_amount || 0;
      }

      return {
        month: d.month,
        fullMonth: d.fullMonth,
        amount: d.isExtended ? null : amount,
        isExtended: d.isExtended,
      };
    });
  }, [filteredData, categorySelection]);

  // Y축 범위 계산 (메인 차트)
  const mainYAxisDomain = useMemo(() => {
    if (filteredData.length === 0) return [-1000000, 1000000];
    const maxIncome = Math.max(...filteredData.map((d) => d.income));
    const maxExpense = Math.max(...filteredData.map((d) => d.expense));
    const maxBalance = Math.max(...filteredData.map((d) => Math.abs(d.balance)));
    const maxValue = Math.max(maxIncome, maxExpense, maxBalance) * 1.1;
    return [-maxValue, maxValue];
  }, [filteredData]);

  // Y축 범위 계산 (카테고리 차트)
  const categoryYAxisDomain = useMemo(() => {
    const amounts = categoryChartData.map((d) => d.amount).filter((a): a is number => a !== null);
    if (amounts.length === 0) return [0, 100000];
    const maxValue = Math.max(...amounts);
    return [0, maxValue * 1.1];
  }, [categoryChartData]);

  // X축 틱 렌더링 (확장 데이터 숨김)
  const renderXAxisTick = (props: { x: number; y: number; payload: { value: string; index: number } }) => {
    const { x, y, payload } = props;
    const dataPoint = filteredData[payload.index];
    if (dataPoint?.isExtended) return null;
    return (
      <text x={x} y={y + 12} textAnchor="middle" fontSize={11} fill="#64748B">
        {payload.value}
      </text>
    );
  };

  // 선택된 월 데이터
  const selectedMonthData = useMemo(() => {
    if (!headerMonth) return null;
    return data.find((d) => d.fullMonth === headerMonth);
  }, [data, headerMonth]);

  // 현재 선택된 카테고리 색상 (지출=파랑, 소득=초록)
  const getCategorySelectionColor = () => {
    return categorySelection.transactionType === 'income'
      ? transaction.income
      : transaction.expense;
  };

  // 현재 선택된 카테고리 라벨
  const getCategorySelectionLabel = () => {
    if (categorySelection.type === 'total') {
      return categorySelection.transactionType === 'income' ? '전체 소득' : '전체 지출';
    }
    return categorySelection.category;
  };

  // 카테고리 합계 계산
  const categoryTotal = useMemo(() => {
    return categoryChartData
      .filter((d) => !d.isExtended && d.amount !== null)
      .reduce((sum, d) => sum + (d.amount || 0), 0);
  }, [categoryChartData]);

  if (isLoading) {
    return (
      <Card className="rounded-2xl">
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (filteredData.length === 0) {
    return (
      <Card className="rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">월별 소득/지출 변화</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[200px] text-slate-400">
            데이터가 없습니다
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">월별 소득/지출 변화</CardTitle>
          {/* 기간 선택 (공유) */}
          <div className="flex gap-1 items-center">
            {(['3', '6', '12'] as PresetPeriod[]).map((p) => (
              <button
                key={p}
                onClick={() => {
                  setPeriod(p);
                  setShowCustomInput(false);
                }}
                className={`px-2 py-0.5 text-xs rounded-md transition-colors ${
                  period === p && !showCustomInput
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {p}개월
              </button>
            ))}
            {showCustomInput ? (
              <div className="flex items-center gap-1">
                <input
                  ref={customInputRef}
                  type="number"
                  min="1"
                  max="24"
                  value={customValue}
                  onChange={(e) => setCustomValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCustomSubmit();
                    if (e.key === 'Escape') {
                      setShowCustomInput(false);
                      setCustomValue('');
                    }
                  }}
                  onBlur={() => {
                    if (!customValue) setShowCustomInput(false);
                  }}
                  className="w-12 px-1.5 py-0.5 text-xs rounded-md border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="1-24"
                />
                <button
                  onClick={handleCustomSubmit}
                  className="px-1.5 py-0.5 text-xs bg-blue-500 text-white rounded-md hover:bg-blue-600"
                >
                  확인
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowCustomInput(true)}
                className={`px-2 py-0.5 text-xs rounded-md transition-colors ${
                  !isPresetPeriod
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {!isPresetPeriod ? `${period}개월` : '직접입력'}
              </button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-2 space-y-6">
        {/* ===== 섹션 1: 소득/지출 분석 ===== */}
        <div>
          <h4 className="text-sm font-medium text-slate-700 mb-2 px-2">소득/지출 분석</h4>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={mainChartData}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis
                  dataKey="month"
                  tick={renderXAxisTick}
                  axisLine={{ stroke: '#E2E8F0' }}
                  tickLine={false}
                />
                <YAxis
                  domain={mainYAxisDomain}
                  tick={{ fontSize: 10, fill: '#64748B' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${Math.abs(v / 10000).toFixed(0)}`}
                />
                <ReferenceLine y={0} stroke="#CBD5E1" strokeWidth={1} />
                <Tooltip
                  formatter={(value, name) => {
                    const numValue = typeof value === 'number' ? value : 0;
                    const absValue = Math.abs(numValue);
                    const label =
                      name === 'income' ? '소득' :
                      name === 'negativeExpense' ? '지출' : '손익';
                    return [formatNumber(absValue) + '원', label];
                  }}
                  labelFormatter={(label) => `${label}`}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                  formatter={(value) => {
                    if (value === 'income') return '소득';
                    if (value === 'negativeExpense') return '지출';
                    if (value === 'balance') return '손익';
                    return value;
                  }}
                />
                <Bar
                  dataKey="income"
                  fill={transaction.income}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={24}
                  onClick={(barData) => {
                    const payload = barData?.payload as { fullMonth?: string } | undefined;
                    if (payload?.fullMonth) onMonthClick?.(payload.fullMonth);
                  }}
                  className="cursor-pointer"
                />
                <Bar
                  dataKey="negativeExpense"
                  fill={transaction.expense}
                  radius={[0, 0, 4, 4]}
                  maxBarSize={24}
                  onClick={(barData) => {
                    const payload = barData?.payload as { fullMonth?: string } | undefined;
                    if (payload?.fullMonth) onMonthClick?.(payload.fullMonth);
                  }}
                  className="cursor-pointer"
                />
                <Line
                  type="monotone"
                  dataKey="balance"
                  stroke={transaction.balance}
                  strokeWidth={2}
                  dot={(props) => {
                    const { cx, cy, index } = props;
                    const dataPoint = mainChartData[index];
                    if (dataPoint?.isExtended) return <></>;
                    return (
                      <circle cx={cx} cy={cy} r={3} fill={transaction.balance} stroke="none" />
                    );
                  }}
                  activeDot={{ r: 5 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* 선택된 월 요약 */}
          {selectedMonthData && (
            <div className="mt-3 pt-3 border-t border-slate-100 px-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">{selectedMonthData.month} 요약</span>
                <div className="flex gap-4">
                  <span style={{ color: transaction.income }}>
                    소득 {formatManwon(selectedMonthData.income)}
                  </span>
                  <span style={{ color: transaction.expense }}>
                    지출 {formatManwon(selectedMonthData.expense)}
                  </span>
                  <span
                    className="font-medium"
                    style={{ color: selectedMonthData.balance >= 0 ? transaction.income : transaction.expense }}
                  >
                    {selectedMonthData.balance >= 0 ? '+' : ''}{formatManwon(selectedMonthData.balance)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ===== 섹션 2: 카테고리 분석 ===== */}
        <div className="pt-4 border-t border-slate-100">
          <h4 className="text-sm font-medium text-slate-700 mb-3 px-2">카테고리 분석</h4>

          {/* 카테고리 태그 선택 (두 줄: 소득/지출) */}
          <div className="space-y-2 px-2 pb-3">
            {/* 소득 카테고리 줄 (초록색) */}
            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
              <button
                onClick={() => setCategorySelection({ type: 'total', transactionType: 'income' })}
                className={`shrink-0 px-2.5 py-1 text-xs rounded-lg transition-colors font-medium ${
                  categorySelection.type === 'total' && categorySelection.transactionType === 'income'
                    ? 'text-white'
                    : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                }`}
                style={{
                  backgroundColor:
                    categorySelection.type === 'total' && categorySelection.transactionType === 'income'
                      ? transaction.income
                      : undefined,
                }}
              >
                전체 소득
              </button>
              {INCOME_CATEGORIES.map((cat: string) => {
                const isSelected =
                  categorySelection.type === 'category' &&
                  categorySelection.category === cat &&
                  categorySelection.transactionType === 'income';
                return (
                  <button
                    key={`income-${cat}`}
                    onClick={() => setCategorySelection({
                      type: 'category',
                      category: cat as Category,
                      transactionType: 'income'
                    })}
                    className={`shrink-0 px-2.5 py-1 text-xs rounded-lg transition-colors ${
                      isSelected
                        ? 'text-white'
                        : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                    }`}
                    style={{
                      backgroundColor: isSelected ? transaction.income : undefined,
                    }}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            {/* 지출 카테고리 줄 (파란색) */}
            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
              <button
                onClick={() => setCategorySelection({ type: 'total', transactionType: 'expense' })}
                className={`shrink-0 px-2.5 py-1 text-xs rounded-lg transition-colors font-medium ${
                  categorySelection.type === 'total' && categorySelection.transactionType === 'expense'
                    ? 'text-white'
                    : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                }`}
                style={{
                  backgroundColor:
                    categorySelection.type === 'total' && categorySelection.transactionType === 'expense'
                      ? transaction.expense
                      : undefined,
                }}
              >
                전체 지출
              </button>
              {ALL_EXPENSE_CATEGORIES.map((cat: string) => {
                const isSelected =
                  categorySelection.type === 'category' &&
                  categorySelection.category === cat &&
                  categorySelection.transactionType === 'expense';
                return (
                  <button
                    key={`expense-${cat}`}
                    onClick={() => setCategorySelection({
                      type: 'category',
                      category: cat as Category,
                      transactionType: 'expense'
                    })}
                    className={`shrink-0 px-2.5 py-1 text-xs rounded-lg transition-colors ${
                      isSelected
                        ? 'text-white'
                        : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                    }`}
                    style={{
                      backgroundColor: isSelected ? transaction.expense : undefined,
                    }}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 카테고리 차트 (막대 위쪽 방향) */}
          <div className="h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={categoryChartData}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis
                  dataKey="month"
                  tick={renderXAxisTick}
                  axisLine={{ stroke: '#E2E8F0' }}
                  tickLine={false}
                />
                <YAxis
                  domain={categoryYAxisDomain}
                  tick={{ fontSize: 10, fill: '#64748B' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${(v / 10000).toFixed(0)}`}
                />
                <Tooltip
                  formatter={(value) => [formatNumber(value as number) + '원', getCategorySelectionLabel()]}
                  labelFormatter={(label) => `${label}`}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Bar
                  dataKey="amount"
                  fill={getCategorySelectionColor()}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* 합계 표시 */}
          <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between items-center px-2">
            <span className="text-xs text-slate-500">{period}개월 합계</span>
            <span className="text-sm font-medium" style={{ color: getCategorySelectionColor() }}>
              {formatManwon(categoryTotal)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
