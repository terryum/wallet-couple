/**
 * 월별 지출 변화 스택 바 차트
 */

'use client';

import { useMemo, useState, useCallback, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatNumber, formatYearMonth } from '@/lib/utils/format';
import { CategoryPopup } from './CategoryPopup';
import { CATEGORY_COLORS, getCategoryColor } from '@/constants/chart';
import {
  calculateCategoriesForPeriod,
  buildStackedBarChartData,
  type StackedBarMonthData,
} from '@/hooks/useCategoryCalculation';
import { brand, transaction } from '@/constants/colors';
import type { Category, TransactionType } from '@/types';

interface StackedBarCardProps {
  data: StackedBarMonthData[];
  isLoading?: boolean;
  headerMonth?: string;
  // 하이라이트 동기화용
  highlightedCategory?: string | null;
  onHighlightChange?: (category: string | null) => void;
  /** 거래 유형: 'expense' | 'income' (기본값: 'expense') */
  transactionType?: TransactionType;
}

type PeriodType = 3 | 6 | 12 | 'custom';

// 현재 날짜 기준으로 기본 기간 계산 (3개월 전 ~ 현재)
function getDefaultDateRange() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  let startYear = currentYear;
  let startMonth = currentMonth - 2;
  if (startMonth <= 0) {
    startMonth += 12;
    startYear -= 1;
  }

  return { startYear, startMonth, endYear: currentYear, endMonth: currentMonth };
}

export function StackedBarCard({
  data,
  isLoading,
  headerMonth,
  highlightedCategory,
  onHighlightChange,
  transactionType = 'expense',
}: StackedBarCardProps) {
  const isIncome = transactionType === 'income';
  const typeLabel = isIncome ? '소득' : '지출';
  const [period, setPeriod] = useState<PeriodType>(6);
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null); // YYYY-MM 전체 저장 (버그 수정)

  // 팝업 상태
  const [popupCategory, setPopupCategory] = useState<string | null>(null);
  const [popupMonth, setPopupMonth] = useState<string | null>(null);
  const [popupEtcCategories, setPopupEtcCategories] = useState<string[]>([]);

  // 직접 기간 선택 팝업용 상태
  const defaultRange = getDefaultDateRange();
  const [tempStartYear, setTempStartYear] = useState(defaultRange.startYear);
  const [tempStartMonth, setTempStartMonth] = useState(defaultRange.startMonth);
  const [tempEndYear, setTempEndYear] = useState(defaultRange.endYear);
  const [tempEndMonth, setTempEndMonth] = useState(defaultRange.endMonth);

  // 헤더 월이 변경되면 해당 월로 선택 동기화
  useEffect(() => {
    if (headerMonth) {
      setSelectedMonth(headerMonth);
    }
  }, [headerMonth]);

  // 기간에 맞게 필터링된 데이터
  const filteredData = useMemo(() => {
    if (!data || data.length === 0) return [];

    if (period === 'custom' && customStart && customEnd) {
      return data.filter((d) => d.month >= customStart && d.month <= customEnd);
    } else if (period !== 'custom') {
      return data.slice(-period);
    }
    return data.slice(-6);
  }, [data, period, customStart, customEnd]);

  // 카테고리 계산 (공유 함수 사용)
  const { topCategories, etcCategories } = useMemo(() => {
    return calculateCategoriesForPeriod(filteredData);
  }, [filteredData]);

  // 차트 데이터 생성
  const chartData = useMemo(() => {
    return buildStackedBarChartData(filteredData, topCategories);
  }, [filteredData, topCategories]);

  // 선택된 월 데이터 (라벨이 아닌 fullMonth로 매칭)
  const selectedMonthData = useMemo(() => {
    if (!selectedMonth || chartData.length === 0) return null;

    const monthData = chartData.find((d) => d.fullMonth === selectedMonth);
    if (!monthData) return null;

    const total = monthData.total as number;
    const totalCount = (monthData.totalCount as number) || 0;
    const monthLabel = monthData.month as string;

    const categories = topCategories
      .map((cat) => ({
        category: cat,
        amount: (monthData[cat] as number) || 0,
        count: (monthData[`${cat}_count`] as number) || 0,
        percentage: total > 0 ? (((monthData[cat] as number) || 0) / total) * 100 : 0,
        color: getCategoryColor(cat),
      }))
      .filter((item) => item.amount > 0)
      .sort((a, b) => b.amount - a.amount);

    return { month: monthLabel, fullMonth: selectedMonth, total, totalCount, categories };
  }, [selectedMonth, chartData, topCategories]);

  // 기간/필터 변경 시 selectedMonth가 새 데이터에 없으면 초기화
  useEffect(() => {
    if (selectedMonth && chartData.length > 0) {
      const exists = chartData.some((d) => d.fullMonth === selectedMonth);
      if (!exists) {
        setSelectedMonth(null);
      }
    }
  }, [chartData, selectedMonth]);

  // 바 클릭 핸들러 - 해당 월의 상세내역 팝업 표시
  const handleBarClick = useCallback((barData: Record<string, unknown>) => {
    const fullMonth = barData.fullMonth as string;

    // 하이라이트된 카테고리가 있으면 해당 카테고리 팝업, 없으면 전체 팝업
    if (highlightedCategory) {
      if (highlightedCategory === 'etc.') {
        setPopupCategory('etc.');
        setPopupEtcCategories(etcCategories);
      } else {
        setPopupCategory(highlightedCategory);
        setPopupEtcCategories([]);
      }
    } else {
      // 전체 선택 상태 - 해당 월의 모든 거래 표시
      setPopupCategory('전체');
      setPopupEtcCategories([]);
    }
    setPopupMonth(fullMonth);

    // selectedMonth도 업데이트
    setSelectedMonth(fullMonth);
  }, [highlightedCategory, etcCategories]);

  // 카테고리 클릭 핸들러 (상세 팝업)
  const handleCategoryClick = useCallback((category: string, fullMonth: string) => {
    if (category === 'etc.') {
      setPopupCategory('etc.');
      setPopupEtcCategories(etcCategories);
    } else {
      setPopupCategory(category);
      setPopupEtcCategories([]);
    }
    setPopupMonth(fullMonth);
  }, [etcCategories]);

  // 레전드 하이라이트 핸들러
  const handleLegendClick = useCallback((category: string) => {
    onHighlightChange?.(category);
  }, [onHighlightChange]);

  // 전체로 리셋 (빈 여백 클릭 시)
  const handleResetHighlight = useCallback(() => {
    onHighlightChange?.('');
  }, [onHighlightChange]);

  // 팝업 닫기
  const handleClosePopup = useCallback(() => {
    setPopupCategory(null);
    setPopupMonth(null);
    setPopupEtcCategories([]);
  }, []);

  // 팝업용 총액
  const popupTotal = useMemo(() => {
    if (!popupCategory || !popupMonth) return 0;
    const monthData = chartData.find((d) => d.fullMonth === popupMonth);
    if (!monthData) return 0;

    // '전체'인 경우 해당 월 총액
    if (popupCategory === '전체') {
      return (monthData.total as number) ?? 0;
    }
    return (monthData[popupCategory] as number) ?? 0;
  }, [popupCategory, popupMonth, chartData]);

  // 사용 가능한 년도 범위
  const yearRange = useMemo(() => {
    if (!data || data.length === 0) {
      const currentYear = new Date().getFullYear();
      return [currentYear - 2, currentYear - 1, currentYear];
    }
    const years = new Set<number>();
    data.forEach((m) => years.add(parseInt(m.month.slice(0, 4))));
    return Array.from(years).sort((a, b) => a - b);
  }, [data]);

  // 직접 지정 적용
  const handleApplyCustom = () => {
    const start = `${tempStartYear}-${String(tempStartMonth).padStart(2, '0')}`;
    const end = `${tempEndYear}-${String(tempEndMonth).padStart(2, '0')}`;
    if (start <= end) {
      setCustomStart(start);
      setCustomEnd(end);
      setPeriod('custom');
      setShowCustomPicker(false);
    }
  };

  // 직접 버튼 클릭 시 팝업 열기
  const handleOpenCustomPicker = () => {
    if (!showCustomPicker) {
      if (customStart && customEnd) {
        setTempStartYear(parseInt(customStart.slice(0, 4)));
        setTempStartMonth(parseInt(customStart.slice(5)));
        setTempEndYear(parseInt(customEnd.slice(0, 4)));
        setTempEndMonth(parseInt(customEnd.slice(5)));
      } else {
        const range = getDefaultDateRange();
        setTempStartYear(range.startYear);
        setTempStartMonth(range.startMonth);
        setTempEndYear(range.endYear);
        setTempEndMonth(range.endMonth);
      }
    }
    setShowCustomPicker(!showCustomPicker);
  };

  // 표시할 카테고리 (하이라이트 필터링 + 스택 순서 지정)
  const displayCategories = useMemo(() => {
    // 하이라이트된 카테고리가 있으면 그것만 표시
    if (highlightedCategory) {
      if (!topCategories.includes(highlightedCategory)) return topCategories;
      return [highlightedCategory];
    }

    // 전체 표시 시 스택 순서 지정 (배열 순서 = 아래에서 위로)
    // 맨 아래: 양육비 → 대출이자 → 관리비 → 기존할부 → 나머지 → etc.
    const fixedOrder = ['양육비', '대출이자', '관리비', '기존할부'];
    const orderedCategories: string[] = [];

    // 1. 고정 순서 카테고리 먼저 추가 (있는 것만)
    for (const cat of fixedOrder) {
      if (topCategories.includes(cat)) {
        orderedCategories.push(cat);
      }
    }

    // 2. 나머지 카테고리 추가 (etc. 제외)
    for (const cat of topCategories) {
      if (!fixedOrder.includes(cat) && cat !== 'etc.') {
        orderedCategories.push(cat);
      }
    }

    // 3. etc.는 맨 마지막 (스택 맨 위)
    if (topCategories.includes('etc.')) {
      orderedCategories.push('etc.');
    }

    return orderedCategories;
  }, [topCategories, highlightedCategory]);

  if (isLoading) {
    return (
      <Card className="rounded-2xl">
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="flex justify-center gap-2 mb-4">
            <Skeleton className="h-8 w-16 rounded-xl" />
            <Skeleton className="h-8 w-16 rounded-xl" />
            <Skeleton className="h-8 w-16 rounded-xl" />
          </div>
          <Skeleton className="w-full h-48" />
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card className="rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">월별 {typeLabel} 변화</CardTitle>
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
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base font-medium shrink-0">월별 {typeLabel} 변화</CardTitle>
            {/* 기간 선택 */}
            <div className="flex gap-1">
              {([3, 6, 12] as const).map((p) => (
                <button
                  key={p}
                  onClick={(e) => {
                    e.stopPropagation();
                    setPeriod(p);
                    setShowCustomPicker(false);
                  }}
                  className={`px-2 py-1 text-xs font-medium rounded-lg transition-all ${
                    period === p
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {p}개월
                </button>
              ))}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenCustomPicker();
                }}
                className={`px-2 py-1 text-xs font-medium rounded-lg transition-all ${
                  period === 'custom'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                직접
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* 직접 기간 선택 팝업 */}
          {showCustomPicker && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowCustomPicker(false)}>
              <div className="bg-white rounded-2xl w-[90%] max-w-sm p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-base font-bold text-slate-900 mb-4 text-center">기간 선택</h3>

                {/* 시작 기간 */}
                <div className="mb-4">
                  <label className="text-xs font-medium text-slate-500 mb-2 block">시작</label>
                  <div className="flex gap-2">
                    <select
                      value={tempStartYear}
                      onChange={(e) => setTempStartYear(parseInt(e.target.value))}
                      className="flex-1 px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#3182F6]"
                    >
                      {yearRange.map((y) => (
                        <option key={y} value={y}>{y}년</option>
                      ))}
                    </select>
                    <select
                      value={tempStartMonth}
                      onChange={(e) => setTempStartMonth(parseInt(e.target.value))}
                      className="flex-1 px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#3182F6]"
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <option key={m} value={m}>{m}월</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 끝 기간 */}
                <div className="mb-5">
                  <label className="text-xs font-medium text-slate-500 mb-2 block">끝</label>
                  <div className="flex gap-2">
                    <select
                      value={tempEndYear}
                      onChange={(e) => setTempEndYear(parseInt(e.target.value))}
                      className="flex-1 px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#3182F6]"
                    >
                      {yearRange.map((y) => (
                        <option key={y} value={y}>{y}년</option>
                      ))}
                    </select>
                    <select
                      value={tempEndMonth}
                      onChange={(e) => setTempEndMonth(parseInt(e.target.value))}
                      className="flex-1 px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#3182F6]"
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <option key={m} value={m}>{m}월</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 기간 미리보기 */}
                <div className="text-center text-sm text-slate-500 mb-4">
                  {tempStartYear}년 {tempStartMonth}월 ~ {tempEndYear}년 {tempEndMonth}월
                </div>

                {/* 버튼 */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowCustomPicker(false)}
                    className="flex-1 py-2.5 text-sm font-medium text-slate-500 bg-slate-100 rounded-xl hover:bg-slate-200"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleApplyCustom}
                    disabled={`${tempStartYear}-${String(tempStartMonth).padStart(2, '0')}` > `${tempEndYear}-${String(tempEndMonth).padStart(2, '0')}`}
                    className="flex-1 py-2.5 text-sm font-medium text-white bg-[#3182F6] rounded-xl hover:bg-[#1B64DA] disabled:opacity-50"
                  >
                    적용
                  </button>
                </div>

                {/* 유효성 경고 */}
                {`${tempStartYear}-${String(tempStartMonth).padStart(2, '0')}` > `${tempEndYear}-${String(tempEndMonth).padStart(2, '0')}` && (
                  <p className="text-xs text-red-500 text-center mt-2">시작 기간이 끝 기간보다 늦습니다</p>
                )}
              </div>
            </div>
          )}

          {/* 차트 - SVG 여백은 클릭 무시, rect(막대)만 클릭 받도록 설정 */}
          <ResponsiveContainer
            width="100%"
            height={200}
            className="[&>svg]:pointer-events-none [&_rect]:pointer-events-auto [&_rect]:cursor-pointer [&_text]:pointer-events-none [&_g]:pointer-events-none"
          >
            <BarChart
              key={`chart-${period}-${customStart}-${customEnd}`}
              data={chartData}
              margin={{ left: -20, right: 10 }}
            >
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={(props) => {
                  const { x, y, payload } = props;
                  const barData = chartData.find((d) => d.month === payload.value);
                  const fullMonth = barData?.fullMonth as string;
                  const isSelected = selectedMonth === fullMonth;
                  return (
                    <g
                      transform={`translate(${x},${y})`}
                      onClick={() => handleBarClick({ fullMonth })}
                      style={{ cursor: 'pointer' }}
                    >
                      <text
                        x={0}
                        y={0}
                        dy={12}
                        textAnchor="middle"
                        fill={isSelected ? brand.primary : '#94a3b8'}
                        fontSize={11}
                        fontWeight={isSelected ? 600 : 400}
                      >
                        {payload.value}
                      </text>
                    </g>
                  );
                }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                tickFormatter={(value) =>
                  value >= 10000 ? `${Math.round(value / 10000)}만` : `${value}`
                }
                domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.12)]}
              />
              {displayCategories.map((category, catIndex) => (
                <Bar
                  key={category}
                  dataKey={category}
                  stackId="a"
                  fill={getCategoryColor(category)}
                  radius={0}
                  cursor="pointer"
                  onClick={(barData: unknown) => {
                    const data = barData as Record<string, unknown>;
                    if (data && data.fullMonth) {
                      handleBarClick({ fullMonth: data.fullMonth as string });
                    }
                  }}
                >
                  {chartData.map((entry, index) => {
                    const isSelected = selectedMonth === entry.fullMonth;
                    return (
                      <Cell
                        key={`cell-${index}`}
                        opacity={selectedMonth && !isSelected ? 0.4 : 1}
                      />
                    );
                  })}
                  {/* 마지막 Bar에만 전월 대비 증감 라벨 표시 (스택 맨 위) */}
                  {catIndex === displayCategories.length - 1 && (
                    <>
                      {/* 금액 라벨 (막대 중간) */}
                      <LabelList
                        dataKey="total"
                        position="center"
                        content={({ x, y, width, index }) => {
                          if (index === undefined) return null;

                          const entry = chartData[index];
                          // 하이라이트된 카테고리가 있으면 해당 카테고리의 금액, 없으면 전체 금액
                          const amount = highlightedCategory
                            ? (entry[highlightedCategory] as number) || 0
                            : (entry.total as number) || 0;

                          if (amount === 0) return null;

                          // 금액을 만 단위로 표시
                          const displayValue = Math.round(amount / 10000);
                          if (displayValue === 0) return null;

                          // 차트 바닥(XAxis 위치)은 약 185px, 스택 맨 위가 y
                          // 전체 막대의 중간 = (스택 맨 위 + 바닥) / 2
                          const chartBottom = 185;
                          const middleY = ((y as number) + chartBottom) / 2;

                          return (
                            <text
                              x={(x as number) + (width as number) / 2}
                              y={middleY}
                              textAnchor="middle"
                              dominantBaseline="middle"
                              fontSize={10}
                              fontWeight={600}
                              fill="#1e293b"
                            >
                              {displayValue}만
                            </text>
                          );
                        }}
                      />
                      {/* 전월 대비 증감 라벨 (스택 맨 위) */}
                      <LabelList
                        dataKey="change"
                        position="top"
                        content={({ x, y, width, index }) => {
                          // 첫 번째 월(index=0)은 비교 대상 없으므로 표시 안함
                          if (index === undefined || index === 0) return null;

                          // 하이라이트된 카테고리가 있으면 해당 카테고리의 증감, 없으면 전체 증감
                          const entry = chartData[index];
                          const changeKey = highlightedCategory ? `${highlightedCategory}_change` : 'change';
                          const change = (entry[changeKey] as number) || 0;

                          if (change === 0) return null;
                          const isPositive = change > 0;
                          const displayValue = Math.round(Math.abs(change) / 10000);
                          // 0만원이면 표시 안함
                          if (displayValue === 0) return null;
                          return (
                            <text
                              x={(x as number) + (width as number) / 2}
                              y={(y as number) - 8}
                              textAnchor="middle"
                              fontSize={9}
                              fontWeight={500}
                              fill={isPositive ? transaction.expense : transaction.income}
                            >
                              {isPositive ? '+' : '-'}{displayValue}만
                            </text>
                          );
                        }}
                      />
                    </>
                  )}
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>

          {/* 필터 레전드 - PieChartCard와 동일한 순서 (선택된 월 기준 금액순 정렬) */}
          <div className="mt-3 flex flex-col items-center">
            {(() => {
              // 선택된 월(headerMonth)의 데이터에서 금액순 정렬 (PieChartCard와 동일)
              const targetMonth = headerMonth || (chartData.length > 0 ? chartData[chartData.length - 1].fullMonth as string : null);
              const monthData = targetMonth ? chartData.find((d) => d.fullMonth === targetMonth) : null;

              // 필터링된 카테고리 (etc.는 데이터가 있을 때만)
              const filteredCategories = topCategories.filter(
                (cat) => cat !== 'etc.' || chartData.some((d) => (d[cat] as number) > 0)
              );

              // 금액순으로 정렬 (선택된 월 기준)
              const sortedCategories = [...filteredCategories].sort((a, b) => {
                if (!monthData) return 0;
                const amountA = (monthData[a] as number) || 0;
                const amountB = (monthData[b] as number) || 0;
                return amountB - amountA;
              });

              // 4개씩 묶어서 행 생성 (첫 행: 전체 + 3개, 나머지: 4개씩)
              const rows: Array<{ category: string | null; label: string }[]> = [];

              // 첫 번째 행: 전체 + 처음 3개 카테고리
              const firstRow: Array<{ category: string | null; label: string }> = [
                { category: null, label: '전체' },
                ...sortedCategories.slice(0, 3).map((cat) => ({ category: cat, label: cat })),
              ];
              rows.push(firstRow);

              // 나머지 행: 4개씩
              const remaining = sortedCategories.slice(3);
              for (let i = 0; i < remaining.length; i += 4) {
                rows.push(
                  remaining.slice(i, i + 4).map((cat) => ({ category: cat, label: cat }))
                );
              }

              return (
                <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(4, auto)' }}>
                  {rows.flat().map((item) => {
                    const isActive = item.category === null
                      ? !highlightedCategory
                      : highlightedCategory === item.category;
                    return (
                      <button
                        key={item.label}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLegendClick(item.category ?? '');
                        }}
                        className={`flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all ${
                          isActive
                            ? 'bg-slate-900 text-white'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        {item.category && (
                          <div
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: getCategoryColor(item.category) }}
                          />
                        )}
                        <span className="whitespace-nowrap">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {/* 선택된 월 상세 정보 */}
          {selectedMonthData && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-slate-900">
                  {selectedMonthData.month}
                </span>
                <div className="flex items-center">
                  <span className="text-xs text-slate-400 w-28 text-right">
                    100.0% ({selectedMonthData.totalCount}건)
                  </span>
                  <span className="text-sm font-bold text-slate-900 w-24 text-right">
                    {formatNumber(selectedMonthData.total)}원
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                {selectedMonthData.categories.map((item) => (
                  <div
                    key={item.category}
                    className="flex items-center justify-between text-xs cursor-pointer hover:bg-slate-50 -mx-2 px-2 py-1.5 rounded-lg transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCategoryClick(item.category, selectedMonthData.fullMonth);
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-slate-600">{item.category}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-slate-400 w-28 text-right">
                        {item.percentage.toFixed(1)}% ({item.count}건)
                      </span>
                      <span className="text-slate-900 font-medium w-24 text-right">
                        {formatNumber(item.amount)}원
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 카테고리 상세 팝업 */}
      <CategoryPopup
        isOpen={!!popupCategory && !!popupMonth}
        onClose={handleClosePopup}
        category={popupCategory}
        etcCategories={popupEtcCategories}
        month={popupMonth || ''}
        totalAmount={popupTotal}
        transactionType={transactionType}
      />
    </>
  );
}
