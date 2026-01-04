/**
 * 가계분석 페이지 컴포넌트
 * 소득+지출 통합 분석
 */

'use client';

import { useRef, useState, useMemo } from 'react';
import { Plus } from 'lucide-react';
import { DualPieChartCard } from './DualPieChartCard';
import { IncomeExpenseBarCard } from './IncomeExpenseBarCard';
import { BillingComparisonCard } from './BillingComparisonCard';
import { SharedHeader, SharedBottomNav } from '@/components/layout';
import { FileUploader, EditModal, type FileUploaderRef } from '@/components/transactions';
import { useAppContext } from '@/contexts/AppContext';
import { useTransactionEditFlow } from '@/hooks/useTransactionEditFlow';
import { useTransactions } from '@/hooks/useTransactions';
import { useMultiMonthBothAggregation } from '@/hooks/useDashboard';
import type { Transaction, Category } from '@/types';

export function HouseholdDashboardContent() {
  const fileUploaderRef = useRef<FileUploaderRef>(null);

  // 전역 상태
  const { selectedMonth, selectedOwner, currentUser } = useAppContext();

  // 기간 상태
  const [period, setPeriod] = useState<string>('6');

  const editFlow = useTransactionEditFlow({
    owner: currentUser,
    enableSimilarModal: false,
    modalIdBase: 'household-dashboard',
  });

  // 월별 소득+지출 데이터 - 소득/지출 탭과 동일한 데이터 소스 사용
  const { data: allData, isLoading: isLoadingMonthly } = useTransactions({
    month: selectedMonth,
    owner: selectedOwner || undefined,
    includeSummary: true,
    transactionType: 'all',
  });

  // 클라이언트에서 income/expense 분리 및 카테고리별 집계
  const { incomeData, incomeTotal, expenseData, expenseTotal } = useMemo(() => {
    const transactions = allData?.data || [];

    const incomeTransactions = transactions.filter(
      (tx) => tx.transaction_type === 'income'
    );
    const expenseTransactions = transactions.filter(
      (tx) => tx.transaction_type !== 'income'
    );

    // 카테고리별 집계 함수
    const aggregateByCategory = (txs: Transaction[]) => {
      const map = new Map<string, { total: number; count: number }>();
      txs.forEach((tx) => {
        const existing = map.get(tx.category) || { total: 0, count: 0 };
        map.set(tx.category, {
          total: existing.total + tx.amount,
          count: existing.count + 1,
        });
      });
      return Array.from(map.entries()).map(([category, stats]) => ({
        category: category as Category,
        total_amount: stats.total,
        count: stats.count,
      }));
    };

    return {
      incomeData: aggregateByCategory(incomeTransactions),
      incomeTotal: incomeTransactions.reduce((sum, tx) => sum + tx.amount, 0),
      expenseData: aggregateByCategory(expenseTransactions),
      expenseTotal: expenseTransactions.reduce((sum, tx) => sum + tx.amount, 0),
    };
  }, [allData]);

  // 추세 데이터 (최대 24개월 - 직접입력 지원, 손익선 확장 포함)
  const maxPeriod = Math.max(parseInt(period) || 6, 12);
  const { data: trendData, isLoading: isLoadingTrend } =
    useMultiMonthBothAggregation(
      Math.min(maxPeriod, 24),
      selectedOwner || undefined,
      selectedMonth,  // 선택된 월을 끝월로 사용
      true            // 손익선 확장을 위해 전후 1개월 추가 조회
    );

  // 업로드 버튼 클릭
  const handleUploadClick = () => {
    fileUploaderRef.current?.trigger();
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-40">
      {/* 공통 헤더 */}
      <div className="sticky top-0 z-40 bg-white border-b border-slate-100">
        <SharedHeader />
      </div>

      {/* 차트 영역 */}
      <div className="px-5 pt-5">
        <div className="max-w-lg mx-auto space-y-6">
          {/* 듀얼 도넛 차트: 소득/지출 비중 */}
          <DualPieChartCard
            incomeData={incomeData}
            incomeTotal={incomeTotal}
            expenseData={expenseData}
            expenseTotal={expenseTotal}
            month={selectedMonth}
            isLoading={isLoadingMonthly}
          />

          {/* 월별 소득/지출 변화 (통합 차트) */}
          <IncomeExpenseBarCard
            data={trendData}
            isLoading={isLoadingTrend}
            headerMonth={selectedMonth}
            period={period}
            onPeriodChange={setPeriod}
          />

          {/* 월별 청구금액 비교 */}
          <BillingComparisonCard />
        </div>
      </div>

      {/* 플로팅 액션 버튼 */}
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 flex gap-3 z-50">
        <button
          onClick={handleUploadClick}
          className="flex items-center gap-2 px-4 py-3 bg-[#3182F6] text-white rounded-2xl shadow-lg hover:bg-[#1B64DA] active:scale-95 transition-all"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          <span className="text-sm font-medium">파일</span>
        </button>
        <button
          onClick={() => editFlow.openEdit(null)}
          className="flex items-center gap-2 px-4 py-3 bg-[#3182F6] text-white rounded-2xl shadow-lg hover:bg-[#1B64DA] active:scale-95 transition-all"
        >
          <Plus className="w-5 h-5" />
          <span className="text-sm font-medium">내역</span>
        </button>
      </div>

      {/* 숨겨진 파일 업로더 */}
      <FileUploader ref={fileUploaderRef} owner={currentUser} hidden />

      {/* 공통 하단 네비게이션 */}
      <SharedBottomNav />

      {/* 편집/추가 모달 */}
      <EditModal {...editFlow.editModalProps} />
    </div>
  );
}
