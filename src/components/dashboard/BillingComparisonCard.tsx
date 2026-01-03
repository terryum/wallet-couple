/**
 * 월별 청구금액 카드
 * 소득 / 청구금액 / 이용금액 비교 표시 (만원 단위)
 */

'use client';

import { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useBillingComparison, type BillingComparisonRow } from '@/hooks/useBillingComparison';
import { useMultiMonthAggregation } from '@/hooks/useDashboard';
import { useAppContext } from '@/contexts/AppContext';
import { formatManwonNumber } from '@/lib/utils/format';

interface BillingComparisonCardProps {
  months?: number;
}

export function BillingComparisonCard({ months = 12 }: BillingComparisonCardProps) {
  const { selectedOwner } = useAppContext();
  const { data, isLoading } = useBillingComparison(months);
  const { data: incomeData, isLoading: isLoadingIncome } = useMultiMonthAggregation(months, selectedOwner || undefined, 'income');
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);

  // 월별 소득 데이터 맵 생성
  const incomeByMonth = useMemo(() => {
    const map: Record<string, number> = {};
    incomeData?.forEach((d) => {
      map[d.month] = d.total;
    });
    return map;
  }, [incomeData]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">월별 청구금액</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">월별 청구금액</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-500 text-sm text-center py-4">
            데이터가 없습니다.
          </p>
        </CardContent>
      </Card>
    );
  }

  const toggleExpand = (month: string) => {
    setExpandedMonth(expandedMonth === month ? null : month);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">월별 청구금액</CardTitle>
      </CardHeader>
      <CardContent>
        {/* 테이블 헤더 - 만원 단위 */}
        <div className="flex items-center px-4 py-2 border-b border-slate-200 text-xs text-slate-500 font-medium">
          <span className="flex-1 text-center">기간</span>
          <span className="w-16 text-center">소득</span>
          <span className="w-16 text-center">청구</span>
          <span className="w-16 text-center">이용</span>
        </div>

        <div className="space-y-1 mt-1">
          {data.map((item) => (
            <MonthRow
              key={item.month}
              data={item}
              incomeAmount={incomeByMonth[item.month] || 0}
              isExpanded={expandedMonth === item.month}
              onToggle={() => toggleExpand(item.month)}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface MonthRowProps {
  data: BillingComparisonRow;
  incomeAmount: number;
  isExpanded: boolean;
  onToggle: () => void;
}

function MonthRow({ data, incomeAmount, isExpanded, onToggle }: MonthRowProps) {
  return (
    <div className="border border-slate-100 rounded-lg overflow-hidden">
      {/* 월별 요약 행 */}
      <button
        onClick={onToggle}
        className="w-full flex items-center px-4 py-3 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2 flex-1">
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
          <span className="text-xs text-slate-400">{data.monthLabel}</span>
        </div>

        {/* 소득 (만원 단위) */}
        <span className="text-sm text-emerald-600 w-16 text-right font-medium">
          {incomeAmount > 0 ? formatManwonNumber(incomeAmount) : '-'}
        </span>
        {/* 청구금액 (만원 단위) */}
        <span className="text-sm text-slate-700 w-16 text-right">
          {data.hasBilling ? formatManwonNumber(data.billing_amount) : '-'}
        </span>
        {/* 이용금액 (만원 단위) */}
        <span className="text-sm text-slate-700 w-16 text-right">
          {formatManwonNumber(data.usage_amount)}
        </span>
      </button>

      {/* 카드별 상세 */}
      {isExpanded && data.cards.length > 0 && (
        <div className="border-t border-slate-100 bg-slate-50 px-4 py-2">
          {data.cards.map((card) => (
            <div
              key={card.source_type}
              className="flex items-center py-1.5 text-xs"
            >
              <span className="text-slate-600 pl-6 flex-1">{card.source_type}</span>
              <span className="text-slate-600 w-16 text-right">-</span>
              <span className="text-slate-600 w-16 text-right">
                {card.hasBilling ? formatManwonNumber(card.billing_amount) : '-'}
              </span>
              <span className="text-slate-600 w-16 text-right">
                {formatManwonNumber(card.usage_amount)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
