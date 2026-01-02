/**
 * 월별 카테고리별 지출 비중 도넛 차트
 */

'use client';

import { useMemo, useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatNumber, formatYearMonth } from '@/lib/utils/format';
import { CategoryPopup } from './CategoryPopup';
import { CATEGORY_COLORS, getCategoryColor } from '@/constants/chart';
import { useCategoryCalculation } from '@/hooks/useCategoryCalculation';
import type { Category, TransactionType } from '@/types';

interface CategoryData {
  category: Category;
  total_amount: number;
  count?: number;
}

interface MonthData {
  month: string;
  total: number;
  totalCount: number;
  byCategory: CategoryData[];
}

interface PieChartCardProps {
  data: CategoryData[];
  total: number;
  month: string;
  isLoading?: boolean;
  onCategoryClick?: (category: Category) => void;
  trendData?: MonthData[];
  // 하이라이트 동기화용
  highlightedCategory?: string | null;
  onHighlightChange?: (category: string | null) => void;
  /** 거래 유형: 'expense' | 'income' (기본값: 'expense') */
  transactionType?: TransactionType;
}

export function PieChartCard({
  data,
  total,
  month,
  isLoading,
  onCategoryClick,
  trendData,
  highlightedCategory,
  onHighlightChange,
  transactionType = 'expense',
}: PieChartCardProps) {
  const isIncome = transactionType === 'income';
  const typeLabel = isIncome ? '소득' : '지출';
  // 팝업 상태
  const [popupCategory, setPopupCategory] = useState<string | null>(null);
  const [popupEtcCategories, setPopupEtcCategories] = useState<string[]>([]);

  // 공유 훅으로 카테고리 계산
  const { chartData, etcCategories } = useCategoryCalculation(data, total);

  // 이전 월 데이터
  const prevMonthData = useMemo(() => {
    if (!trendData || trendData.length < 2) return null;
    const currentIndex = trendData.findIndex((d) => d.month === month);
    if (currentIndex <= 0) return null;
    return trendData[currentIndex - 1];
  }, [trendData, month]);

  // 전월 대비 인사이트 계산
  const insight = useMemo(() => {
    if (!trendData || trendData.length < 2) return null;

    const currentMonthData = trendData.find((d) => d.month === month);
    const currentIndex = trendData.findIndex((d) => d.month === month);

    if (!currentMonthData || currentIndex <= 0) return null;

    const prevMonth = trendData[currentIndex - 1];
    if (!prevMonth || prevMonth.total === 0) return null;

    const diff = currentMonthData.total - prevMonth.total;
    const percentDiff = ((currentMonthData.total - prevMonth.total) / prevMonth.total) * 100;

    if (diff === 0) return null;

    const isUp = diff > 0;
    const arrow = isUp ? '↑' : '↓';
    const text = `${formatNumber(Math.abs(diff))}원(${Math.abs(percentDiff).toFixed(0)}%)${arrow}`;

    return { text, isUp };
  }, [trendData, month]);

  // 카테고리 클릭 핸들러
  const handleCategoryClick = (category: string) => {
    if (category === 'etc.') {
      setPopupCategory('etc.');
      setPopupEtcCategories(etcCategories);
    } else {
      setPopupCategory(category);
      setPopupEtcCategories([]);
    }
  };

  // 레전드 하이라이트 핸들러
  const handleLegendClick = (category: string) => {
    onHighlightChange?.(category);
  };

  // 전체로 리셋 (빈 여백 클릭 시)
  const handleResetHighlight = () => {
    onHighlightChange?.('');
  };

  // 총 지출 클릭 시 해당 월의 전체 상세내역 팝업 표시
  const handleTotalClick = () => {
    setPopupCategory('전체');
    setPopupEtcCategories([]);
  };

  // 팝업 닫기
  const handleClosePopup = () => {
    setPopupCategory(null);
    setPopupEtcCategories([]);
  };

  // 팝업용 총액 계산
  const popupTotal = useMemo(() => {
    if (!popupCategory) return 0;
    // '전체'인 경우 전체 총액
    if (popupCategory === '전체') return total;
    const found = chartData.find((c) => c.name === popupCategory);
    return found?.value ?? 0;
  }, [popupCategory, chartData, total]);

  if (isLoading) {
    return (
      <Card className="rounded-2xl">
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="flex justify-center">
            <Skeleton className="w-48 h-48 rounded-full" />
          </div>
          <div className="flex justify-center gap-4 mt-4">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card className="rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">
            {formatYearMonth(month)} {typeLabel} 비중
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <p className="text-sm">데이터가 없습니다</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="rounded-2xl cursor-pointer" onClick={handleResetHighlight}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium">
              {formatYearMonth(month)} {typeLabel} 비중
            </CardTitle>
            {insight && (
              <span className={`text-sm ${
                isIncome
                  ? (insight.isUp ? 'text-[#3182F6]' : 'text-red-500')  // 소득: 증가=파랑, 감소=빨강
                  : (insight.isUp ? 'text-red-500' : 'text-[#3182F6]')  // 지출: 증가=빨강, 감소=파랑
              }`}>
                {insight.text}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* 파이 차트 영역 */}
          <div className="relative flex flex-col items-center">
            <div
              className="relative w-[220px] h-[220px] cursor-pointer"
              onClick={handleResetHighlight}
            >
              {/* SVG와 텍스트는 클릭 무시, path(파이 슬라이스)만 클릭 받도록 설정 */}
              <ResponsiveContainer
                width="100%"
                height="100%"
                className="[&>svg]:pointer-events-none [&_path]:pointer-events-auto [&_path]:cursor-pointer [&_text]:pointer-events-none"
              >
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={2}
                    dataKey="value"
                    isAnimationActive={false}
                    label={({ cx, cy, midAngle, innerRadius, outerRadius, name, percent }) => {
                      // 7% 이상인 카테고리만 라벨 표시
                      const percentage = (percent ?? 0) * 100;
                      if (percentage < 7) return null;

                      const RADIAN = Math.PI / 180;
                      const angle = midAngle ?? 0;
                      // 도넛 차트의 중간 위치에 라벨 배치
                      const radius = ((innerRadius as number) + (outerRadius as number)) / 2;
                      const x = (cx as number) + radius * Math.cos(-angle * RADIAN);
                      const y = (cy as number) + radius * Math.sin(-angle * RADIAN);

                      return (
                        <text
                          x={x}
                          y={y}
                          textAnchor="middle"
                          dominantBaseline="central"
                          className="text-[9px] fill-slate-900"
                        >
                          <tspan x={x} dy="-0.4em">{name}</tspan>
                          <tspan x={x} dy="1.1em">{percentage.toFixed(0)}%</tspan>
                        </text>
                      );
                    }}
                    labelLine={false}
                  >
                    {chartData.map((entry, index) => {
                      const isHighlighted = !highlightedCategory || highlightedCategory === entry.name;
                      return (
                        <Cell
                          key={index}
                          fill={entry.color}
                          className="cursor-pointer"
                          style={{ opacity: isHighlighted ? 1 : 0.3 }}
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            handleCategoryClick(entry.name);
                          }}
                        />
                      );
                    })}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              {/* 중앙 총액 표시 - 클릭 시 해당 월 전체 상세내역 팝업 */}
              {/* 도넛 구멍 영역(innerRadius=65)만 커버하도록 크기 제한 */}
              <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120px] h-[120px] rounded-full flex items-center justify-center cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  handleTotalClick();
                }}
              >
                <div className="text-center">
                  <p className="text-xs text-slate-400">총 {typeLabel}</p>
                  <p className="text-lg font-bold tracking-tight text-slate-900">
                    {formatNumber(total)}원
                  </p>
                </div>
              </div>
            </div>

            {/* 레전드 */}
            <div className="flex justify-center mt-4">
              <div
                className="grid gap-x-3 gap-y-1.5"
                style={{ gridTemplateColumns: `repeat(${Math.min(3, chartData.length)}, auto)` }}
              >
                {chartData.map((entry, index) => {
                  const isHighlighted = !highlightedCategory || highlightedCategory === entry.name;
                  return (
                    <div
                      key={index}
                      className="flex items-center gap-1 cursor-pointer hover:opacity-70 transition-opacity"
                      style={{ opacity: isHighlighted ? 1 : 0.4 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLegendClick(entry.name);
                      }}
                    >
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="text-xs text-slate-700 font-medium">{entry.name}</span>
                      <span className="text-xs text-slate-500">{entry.percentage.toFixed(0)}%</span>
                    </div>
                  );
                })}
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
        etcCategories={popupEtcCategories}
        month={month}
        totalAmount={popupTotal}
      />
    </>
  );
}
