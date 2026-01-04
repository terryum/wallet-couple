/**
 * 가계분석용 듀얼 도넛 차트
 * 소득(왼쪽) + 지출(오른쪽) 동시 표시
 */

'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatNumber, formatYearMonth, formatManwon } from '@/lib/utils/format';
import { safePercentage } from '@/lib/utils/math';
import { CategoryPopup } from './CategoryPopup';
import { getCategoryColor } from '@/constants/chart';
import { transaction } from '@/constants/colors';
import type { Category, TransactionType } from '@/types';

interface CategoryData {
  category: Category;
  total_amount: number;
  count?: number;
}

interface DualPieChartCardProps {
  incomeData: CategoryData[];
  incomeTotal: number;
  expenseData: CategoryData[];
  expenseTotal: number;
  month: string;
  isLoading?: boolean;
  onCategoryClick?: (category: string, type: TransactionType) => void;
}

interface ChartEntry {
  name: string;
  value: number;
  color: string;
  percentage: number;
  [key: string]: string | number;
}

function prepareChartData(
  data: CategoryData[],
  total: number
): ChartEntry[] {
  if (total === 0) return [];

  return data
    .filter((d) => d.total_amount > 0)
    .sort((a, b) => b.total_amount - a.total_amount)
    .map((d) => ({
      name: d.category,
      value: d.total_amount,
      color: getCategoryColor(d.category),
      percentage: safePercentage(d.total_amount, total),
    }));
}

export function DualPieChartCard({
  incomeData,
  incomeTotal,
  expenseData,
  expenseTotal,
  month,
  isLoading,
  onCategoryClick,
}: DualPieChartCardProps) {
  const [popupCategory, setPopupCategory] = useState<string | null>(null);
  const [popupType, setPopupType] = useState<TransactionType>('expense');
  const [incomeExpanded, setIncomeExpanded] = useState(false);
  const [expenseExpanded, setExpenseExpanded] = useState(false);

  const incomeChartData = prepareChartData(incomeData, incomeTotal);
  const expenseChartData = prepareChartData(expenseData, expenseTotal);

  const balance = incomeTotal - expenseTotal;

  const handleCategoryClick = (category: string, type: TransactionType) => {
    setPopupCategory(category);
    setPopupType(type);
    onCategoryClick?.(category, type);
  };

  const handleClosePopup = () => {
    setPopupCategory(null);
  };

  // 커스텀 라벨 렌더러 - 모든 항목 표시
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderLabel = (props: any) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, name, percent } = props;
    if (cx === undefined || cy === undefined || midAngle === undefined) return null;
    const percentage = (percent ?? 0) * 100;

    // 3% 미만은 표시하지 않음 (너무 작은 영역)
    if (percentage < 3) return null;

    const RADIAN = Math.PI / 180;
    const radius = (innerRadius + outerRadius) / 2;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    // 작은 영역은 퍼센트만 표시
    if (percentage < 8) {
      return (
        <text
          x={x}
          y={y}
          textAnchor="middle"
          dominantBaseline="central"
          className="text-[8px] fill-white font-medium"
        >
          {percentage.toFixed(0)}%
        </text>
      );
    }

    return (
      <text
        x={x}
        y={y}
        textAnchor="middle"
        dominantBaseline="central"
        className="text-[9px] fill-white font-medium"
      >
        <tspan x={x} dy="-0.4em">{name}</tspan>
        <tspan x={x} dy="1.1em">{percentage.toFixed(0)}%</tspan>
      </text>
    );
  };

  if (isLoading) {
    return (
      <Card className="rounded-2xl">
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Skeleton className="flex-1 aspect-square rounded-full" />
            <Skeleton className="flex-1 aspect-square rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="rounded-2xl">
        <CardHeader className="pb-1">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium">
              {formatYearMonth(month)} 소득/지출 비중
            </CardTitle>
            <span
              className="text-sm font-medium"
              style={{ color: balance >= 0 ? transaction.balancePositive : transaction.balance }}
            >
              {balance >= 0 ? '+' : ''}{formatManwon(balance)}
            </span>
          </div>
        </CardHeader>
        <CardContent className="px-1 pb-2">
          <div className="flex gap-0">
            {/* 소득 도넛 - 왼쪽 */}
            <div className="flex-1 flex flex-col items-center">
              <div className="relative w-full aspect-square max-w-[180px]">
                {incomeChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={incomeChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius="40%"
                        outerRadius="98%"
                        paddingAngle={1}
                        dataKey="value"
                        isAnimationActive={false}
                        label={renderLabel}
                        labelLine={false}
                      >
                        {incomeChartData.map((entry, index) => (
                          <Cell
                            key={index}
                            fill={entry.color}
                            className="cursor-pointer"
                            onClick={() => handleCategoryClick(entry.name, 'income')}
                          />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300 text-sm">
                    소득 없음
                  </div>
                )}
                {/* 중앙 총액 - 데이터 있을 때만 표시 */}
                {incomeChartData.length > 0 && (
                  <div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center cursor-pointer"
                    onClick={() => handleCategoryClick('전체', 'income')}
                  >
                    <p className="text-[10px] text-emerald-600 font-medium">소득</p>
                    <p className="text-xs font-bold text-slate-900">
                      {formatManwon(incomeTotal)}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* 지출 도넛 - 오른쪽 */}
            <div className="flex-1 flex flex-col items-center">
              <div className="relative w-full aspect-square max-w-[180px]">
                {expenseChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={expenseChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius="40%"
                        outerRadius="98%"
                        paddingAngle={1}
                        dataKey="value"
                        isAnimationActive={false}
                        label={renderLabel}
                        labelLine={false}
                      >
                        {expenseChartData.map((entry, index) => (
                          <Cell
                            key={index}
                            fill={entry.color}
                            className="cursor-pointer"
                            onClick={() => handleCategoryClick(entry.name, 'expense')}
                          />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300 text-sm">
                    지출 없음
                  </div>
                )}
                {/* 중앙 총액 - 데이터 있을 때만 표시 */}
                {expenseChartData.length > 0 && (
                  <div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center cursor-pointer"
                    onClick={() => handleCategoryClick('전체', 'expense')}
                  >
                    <p className="text-[10px] text-blue-600 font-medium">지출</p>
                    <p className="text-xs font-bold text-slate-900">
                      {formatManwon(expenseTotal)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 카테고리별 드롭다운 - 나란히 배치 */}
          <div className="mt-3 pt-3 border-t border-slate-100 px-2">
            {/* 헤더: 소득/지출 나란히 */}
            <div className="flex gap-2">
              {/* 소득 드롭다운 */}
              <div className="flex-1 min-w-0">
                <button
                  onClick={() => setIncomeExpanded(!incomeExpanded)}
                  className="w-full flex items-center justify-between py-1.5 hover:bg-slate-50 rounded-lg transition-colors px-1"
                >
                  <span className="text-sm font-medium text-emerald-600">소득</span>
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-medium text-slate-900 tabular-nums">{formatManwon(incomeTotal)}</span>
                    {incomeExpanded ? (
                      <ChevronUp className="w-3 h-3 text-emerald-500" />
                    ) : (
                      <ChevronDown className="w-3 h-3 text-emerald-500" />
                    )}
                  </div>
                </button>
                {incomeExpanded && (
                  <div className="mt-1 space-y-1">
                    {incomeChartData.slice(0, 5).map((entry) => (
                      <div
                        key={entry.name}
                        className="flex items-center justify-between text-xs py-1 cursor-pointer hover:bg-slate-50 rounded px-1"
                        onClick={() => handleCategoryClick(entry.name, 'income')}
                      >
                        <div className="flex items-center gap-1 min-w-0">
                          <div
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: entry.color }}
                          />
                          <span className="text-slate-600 truncate">{entry.name}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-slate-900 font-medium tabular-nums">{formatManwon(entry.value)}</span>
                          <span className="text-slate-400 text-[10px] w-7 text-right">{entry.percentage.toFixed(0)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 지출 드롭다운 */}
              <div className="flex-1 min-w-0">
                <button
                  onClick={() => setExpenseExpanded(!expenseExpanded)}
                  className="w-full flex items-center justify-between py-1.5 hover:bg-slate-50 rounded-lg transition-colors px-1"
                >
                  <span className="text-sm font-medium text-blue-600">지출</span>
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-medium text-slate-900 tabular-nums">{formatManwon(expenseTotal)}</span>
                    {expenseExpanded ? (
                      <ChevronUp className="w-3 h-3 text-blue-500" />
                    ) : (
                      <ChevronDown className="w-3 h-3 text-blue-500" />
                    )}
                  </div>
                </button>
                {expenseExpanded && (
                  <div className="mt-1 space-y-1">
                    {expenseChartData.slice(0, 5).map((entry) => (
                      <div
                        key={entry.name}
                        className="flex items-center justify-between text-xs py-1 cursor-pointer hover:bg-slate-50 rounded px-1"
                        onClick={() => handleCategoryClick(entry.name, 'expense')}
                      >
                        <div className="flex items-center gap-1 min-w-0">
                          <div
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: entry.color }}
                          />
                          <span className="text-slate-600 truncate">{entry.name}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-slate-900 font-medium tabular-nums">{formatManwon(entry.value)}</span>
                          <span className="text-slate-400 text-[10px] w-7 text-right">{entry.percentage.toFixed(0)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 카테고리 상세 팝업 */}
      <CategoryPopup
        isOpen={!!popupCategory}
        onClose={handleClosePopup}
        category={popupCategory}
        month={month}
        transactionType={popupType}
      />
    </>
  );
}
