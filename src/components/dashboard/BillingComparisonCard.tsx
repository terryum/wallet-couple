/**
 * 월별 청구금액 카드
 * 월별 청구금액 vs 이용금액 비교 표시
 */

'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useBillingComparison, type BillingComparisonRow } from '@/hooks/useBillingComparison';
import { formatCurrency } from '@/lib/utils/format';

interface BillingComparisonCardProps {
  months?: number;
}

export function BillingComparisonCard({ months = 12 }: BillingComparisonCardProps) {
  const { data, isLoading } = useBillingComparison(months);
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);

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
        {/* 테이블 헤더 */}
        <div className="flex items-center px-4 py-2 border-b border-slate-200 text-xs text-slate-500 font-medium">
          <span className="flex-1 text-center">기간</span>
          <span className="w-24 text-center">청구금액</span>
          <span className="w-24 text-center">이용금액</span>
        </div>

        <div className="space-y-1 mt-1">
          {data.map((item) => (
            <MonthRow
              key={item.month}
              data={item}
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
  isExpanded: boolean;
  onToggle: () => void;
}

function MonthRow({ data, isExpanded, onToggle }: MonthRowProps) {
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

        {/* 청구금액 */}
        <span className="text-sm text-slate-700 w-24 text-right">
          {data.hasBilling ? formatCurrency(data.billing_amount) : '-'}
        </span>
        {/* 이용금액 */}
        <span className="text-sm text-slate-700 w-24 text-right">
          {formatCurrency(data.usage_amount)}
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
              <span className="text-slate-600 w-24 text-right">
                {card.hasBilling ? formatCurrency(card.billing_amount) : '-'}
              </span>
              <span className="text-slate-600 w-24 text-right">
                {formatCurrency(card.usage_amount)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
