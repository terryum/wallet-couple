/**
 * 카테고리별 소득/지출 변화 차트
 * 특정 카테고리의 월별 추세를 보여줌
 */

'use client';

import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatNumber, formatManwon } from '@/lib/utils/format';
import { getCategoryColor } from '@/constants/chart';
import { ALL_EXPENSE_CATEGORIES, INCOME_CATEGORIES, type Category } from '@/types';

interface CategoryTrendData {
  month: string;
  fullMonth: string;
  amount: number;
}

interface CategoryTrendCardProps {
  data: CategoryTrendData[];
  selectedCategory: Category | null;
  onCategoryChange: (category: Category | null) => void;
  isLoading?: boolean;
  period: string;
  onPeriodChange: (period: string) => void;
  categoryType: 'expense' | 'income';
  onCategoryTypeChange: (type: 'expense' | 'income') => void;
}

export function CategoryTrendCard({
  data,
  selectedCategory,
  onCategoryChange,
  isLoading,
  period,
  onPeriodChange,
  categoryType,
  onCategoryTypeChange,
}: CategoryTrendCardProps) {
  // 현재 탭에 맞는 카테고리 목록
  const categories = categoryType === 'expense' ? ALL_EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  // 첫 번째 카테고리 자동 선택
  const displayCategory = selectedCategory || categories[0];
  const categoryColor = getCategoryColor(displayCategory);

  // Y축 범위 계산
  const yAxisDomain = useMemo(() => {
    if (data.length === 0) return [0, 100000];
    const maxValue = Math.max(...data.map((d) => d.amount));
    return [0, maxValue * 1.1];
  }, [data]);

  if (isLoading) {
    return (
      <Card className="rounded-2xl">
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">카테고리별 변화</CardTitle>
          {/* 기간 선택 */}
          <div className="flex gap-1">
            {['3', '6', '12'].map((p) => (
              <button
                key={p}
                onClick={() => onPeriodChange(p)}
                className={`px-2 py-0.5 text-xs rounded-md transition-colors ${
                  period === p
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {p}개월
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-2">
        {/* 소득/지출 탭 */}
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => {
              onCategoryTypeChange('expense');
              onCategoryChange(null);
            }}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              categoryType === 'expense'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            지출
          </button>
          <button
            onClick={() => {
              onCategoryTypeChange('income');
              onCategoryChange(null);
            }}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              categoryType === 'income'
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            소득
          </button>
        </div>

        {/* 카테고리 선택 */}
        <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map((cat: string) => (
            <button
              key={cat}
              onClick={() => onCategoryChange(cat as Category)}
              className={`shrink-0 px-2.5 py-1 text-xs rounded-lg transition-colors ${
                displayCategory === cat
                  ? 'text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              style={{
                backgroundColor: displayCategory === cat ? getCategoryColor(cat) : undefined,
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* 차트 */}
        <div className="h-[180px] mt-2">
          {data.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              >
                <defs>
                  <linearGradient id={`colorGradient-${displayCategory}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={categoryColor} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={categoryColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 10, fill: '#64748B' }}
                  axisLine={{ stroke: '#E2E8F0' }}
                  tickLine={false}
                />
                <YAxis
                  domain={yAxisDomain}
                  tick={{ fontSize: 10, fill: '#64748B' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${(v / 10000).toFixed(0)}`}
                />
                <Tooltip
                  formatter={(value) => [formatNumber(value as number) + '원', displayCategory]}
                  labelFormatter={(label) => `${label}`}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke={categoryColor}
                  strokeWidth={2}
                  fill={`url(#colorGradient-${displayCategory})`}
                  dot={{ fill: categoryColor, r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
              데이터가 없습니다
            </div>
          )}
        </div>

        {/* 합계 표시 */}
        {data.length > 0 && (
          <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between items-center">
            <span className="text-xs text-slate-500">{period}개월 합계</span>
            <span className="text-sm font-medium" style={{ color: categoryColor }}>
              {formatManwon(data.reduce((sum, d) => sum + d.amount, 0))}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
