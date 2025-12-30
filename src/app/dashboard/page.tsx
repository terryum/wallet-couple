/**
 * 대시보드 페이지 - 분석 화면
 * Design System: Apple/Clean Style
 */

'use client';

import { useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { PieChartCard, StackedBarCard, BillingComparisonCard } from '@/components/dashboard';
import { SharedHeader, SharedBottomNav } from '@/components/layout';
import { FileUploader, EditModal, type FileUploaderRef } from '@/components/transactions';
import { useAppContext } from '@/contexts/AppContext';
import {
  useMonthlyAggregation,
  useMultiMonthAggregation,
} from '@/hooks/useDashboard';
import type { Category } from '@/types';

export default function DashboardPage() {
  const router = useRouter();
  const fileUploaderRef = useRef<FileUploaderRef>(null);

  // 전역 상태
  const { selectedMonth, selectedOwner, currentUser } = useAppContext();

  // 로컬 상태
  const [editModalOpen, setEditModalOpen] = useState(false);

  // 양쪽 차트 동기화용 하이라이트 카테고리
  const [highlightedCategory, setHighlightedCategory] = useState<string | null>(null);

  // 월별 집계 데이터
  const { data: monthlyData, isLoading: isLoadingMonthly } =
    useMonthlyAggregation(selectedMonth, selectedOwner || undefined);

  // 추세 데이터 (12개월)
  const { data: trendData, isLoading: isLoadingTrend } =
    useMultiMonthAggregation(12, selectedOwner || undefined);

  // 카테고리 클릭 시 내역 페이지로 이동
  const handleCategoryClick = (category: Category) => {
    router.push(`/?month=${selectedMonth}&category=${category}`);
  };

  // 업로드 버튼 클릭
  const handleUploadClick = () => {
    fileUploaderRef.current?.trigger();
  };

  // 하이라이트 토글 핸들러 (양쪽 차트 동기화)
  const handleHighlightChange = useCallback((category: string | null) => {
    setHighlightedCategory((prev) => (prev === category ? null : category));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 pb-40">
      {/* 공통 헤더 */}
      <div className="sticky top-0 z-40 bg-white border-b border-slate-100">
        <SharedHeader />
      </div>

      {/* 차트 영역 - 수직 스크롤 */}
      <div className="px-5 pt-5">
        <div className="max-w-lg mx-auto space-y-6">
          {/* 도넛 차트: 카테고리별 지출 비중 */}
          <PieChartCard
            data={monthlyData?.data || []}
            total={monthlyData?.total || 0}
            month={selectedMonth}
            isLoading={isLoadingMonthly}
            onCategoryClick={handleCategoryClick}
            trendData={trendData || []}
            highlightedCategory={highlightedCategory}
            onHighlightChange={handleHighlightChange}
          />

          {/* 스택 바 차트: 월별 지출 변화 */}
          <StackedBarCard
            data={trendData || []}
            isLoading={isLoadingTrend}
            headerMonth={selectedMonth}
            highlightedCategory={highlightedCategory}
            onHighlightChange={handleHighlightChange}
          />

          {/* 청구금액 비교 */}
          <BillingComparisonCard />
        </div>
      </div>

      {/* 플로팅 액션 버튼 - 하단 중앙 */}
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
          onClick={() => setEditModalOpen(true)}
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
      <EditModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        transaction={null}
        owner={currentUser}
      />
    </div>
  );
}
