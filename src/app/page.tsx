/**
 * 메인 페이지 - 거래 내역 화면
 * Design System: Apple/Clean Style
 */

'use client';

import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { Plus, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  TransactionList,
  FileUploader,
  EditModal,
  SimilarTransactionsModal,
  SummaryCard,
  type FileUploaderRef,
} from '@/components/transactions';
import { SharedHeader, SharedBottomNav } from '@/components/layout';
import { SearchBar, FilterPanel } from '@/components/search';
import { useAppContext } from '@/contexts/AppContext';
import { useTransactions, useDeleteTransaction } from '@/hooks/useTransactions';
import {
  useSearchTransactions,
  isSearchActive,
  DEFAULT_FILTERS,
} from '@/hooks/useSearchTransactions';
import { useTransactionEditFlow } from '@/hooks/useTransactionEditFlow';
import { formatNumber } from '@/lib/utils/format';
import type { Transaction, Category, SearchFilters } from '@/types';
import { ALL_EXPENSE_CATEGORIES } from '@/types';

/** 이전 월 계산 */
function getPrevMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split('-').map(Number);
  const date = new Date(year, month - 2, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export default function HomePage() {
  const fileUploaderRef = useRef<FileUploaderRef>(null);

  // 스크롤 위치 저장용 ref
  const savedScrollPositionRef = useRef<number | null>(null);

  // 전역 상태
  const { selectedMonth, selectedOwner, currentUser } = useAppContext();

  // 로컬 상태
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [searchFilters, setSearchFilters] = useState<SearchFilters>(DEFAULT_FILTERS);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const searchActive = isSearchActive(searchFilters);

  const editFlow = useTransactionEditFlow({
    owner: currentUser,
    openSimilarDelayMs: 50,
    modalIdBase: 'home',
  });

  // 드래그 앤 드롭 상태
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);

  // 이전 월 계산
  const prevMonth = useMemo(() => getPrevMonth(selectedMonth), [selectedMonth]);

  // 전체 데이터 조회 (SummaryCard용 - 소득+지출 모두 필요)
  const { data: allData } = useTransactions({
    month: selectedMonth,
    owner: selectedOwner || undefined,
    includeSummary: true,
    transactionType: 'all', // SummaryCard는 소득+지출 모두 표시
  });

  // 이전 월 데이터 조회 (SummaryCard 증감 비교용)
  const { data: prevMonthData } = useTransactions({
    month: prevMonth,
    owner: selectedOwner || undefined,
    includeSummary: true,
    transactionType: 'all', // SummaryCard는 소득+지출 모두 표시
  });

  // 선택된 카테고리 데이터 조회 (내역 탭용 - 지출만)
  const { data, isLoading } = useTransactions({
    month: selectedMonth,
    owner: selectedOwner || undefined,
    category: selectedCategory || undefined,
    includeSummary: true,
    // transactionType: 'expense' (기본값)
  });

  // 검색 데이터 조회 (검색 활성화 시)
  const { data: searchData, isLoading: searchLoading } = useSearchTransactions(
    searchFilters,
    {
      enabled: searchActive,
      currentMonth: selectedMonth,
      owner: selectedOwner,
    }
  );

  // 카테고리별 합계 금액 계산 (지출만)
  const categoryTotals = useMemo(() => {
    const allTransactions = allData?.data || [];
    // 지출만 필터링 (소득 카테고리 제외)
    const expenseTransactions = allTransactions.filter((tx) => tx.transaction_type !== 'income');
    const totals = new Map<Category, number>();

    expenseTransactions.forEach((tx) => {
      const current = totals.get(tx.category) || 0;
      totals.set(tx.category, current + tx.amount);
    });

    return totals;
  }, [allData]);

  // 정렬된 카테고리 목록: 금액순 → 0원은 가나다순 (지출 카테고리만)
  const sortedCategories = useMemo(() => {
    const withAmount: Category[] = [];
    const withoutAmount: Category[] = [];

    ALL_EXPENSE_CATEGORIES.forEach((category) => {
      const total = categoryTotals.get(category) || 0;
      if (total > 0) {
        withAmount.push(category);
      } else {
        withoutAmount.push(category);
      }
    });

    // 금액 있는 카테고리: 금액 내림차순
    withAmount.sort((a, b) => {
      const aTotal = categoryTotals.get(a) || 0;
      const bTotal = categoryTotals.get(b) || 0;
      return bTotal - aTotal;
    });

    // 금액 없는 카테고리: 가나다순
    withoutAmount.sort((a, b) => a.localeCompare(b, 'ko'));

    return [...withAmount, ...withoutAmount];
  }, [categoryTotals]);

  // 삭제 뮤테이션
  const { mutate: deleteTransaction } = useDeleteTransaction();

  // 필터된 거래 내역 (검색 활성화 시 검색 결과 사용)
  const transactions = useMemo(() => {
    if (searchActive) {
      return searchData?.data || [];
    }
    return data?.data || [];
  }, [searchActive, searchData, data]);

  // 로딩 상태
  const transactionsLoading = searchActive ? searchLoading : isLoading;

  // 선택된 카테고리의 총 금액
  const categoryTotal = useMemo(() => {
    if (!selectedCategory || !transactions.length) return 0;
    return transactions.reduce((sum, tx) => sum + tx.amount, 0);
  }, [selectedCategory, transactions]);

  // 모달이 닫히고 데이터가 갱신된 후 스크롤 위치 복원
  useEffect(() => {
    // 모달이 열려있거나 저장된 스크롤 위치가 없으면 스킵
    if (editFlow.editModalOpen || savedScrollPositionRef.current === null) {
      return;
    }

    // 약간의 딜레이 후 스크롤 위치 복원 (데이터 갱신 후)
    const timeoutId = setTimeout(() => {
      if (savedScrollPositionRef.current !== null) {
        window.scrollTo({ top: savedScrollPositionRef.current, behavior: 'instant' });
        savedScrollPositionRef.current = null;
      }
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [editFlow.editModalOpen, transactions]);

  // 행 클릭 (편집)
  const handleLongPress = (transaction: Transaction) => {
    // 편집 모달 열기 전에 스크롤 위치 저장
    savedScrollPositionRef.current = window.scrollY;
    editFlow.openEdit(transaction);
  };

  // 삭제
  const handleDelete = (transaction: Transaction) => {
    if (confirm(`"${transaction.merchant_name}" 항목을 삭제하시겠습니까?`)) {
      deleteTransaction(transaction.id);
    }
  };

  // 업로드 버튼 클릭
  const handleUploadClick = () => {
    fileUploaderRef.current?.trigger();
  };

  // 드래그 앤 드롭 핸들러
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      // 엑셀 파일만 필터링
      const validFiles = Array.from(files).filter((file) =>
        file.name.endsWith('.xls') ||
        file.name.endsWith('.xlsx') ||
        file.name.endsWith('.csv')
      );
      if (validFiles.length > 0) {
        fileUploaderRef.current?.handleFiles(validFiles);
      }
    }
  }, []);

  return (
    <div
      className="min-h-screen bg-slate-50 pb-24 relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* 드래그 앤 드롭 오버레이 */}
      {isDragging && (
        <div className="fixed inset-0 bg-[#3182F6]/10 backdrop-blur-sm z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-white rounded-3xl p-8 shadow-2xl border-2 border-dashed border-[#3182F6] flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#3182F6]/10 flex items-center justify-center">
              <Upload className="w-8 h-8 text-[#3182F6]" />
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-slate-900">파일을 놓아주세요</p>
              <p className="text-sm text-slate-500 mt-1">엑셀 파일(.xls, .xlsx, .csv)을 업로드합니다</p>
            </div>
          </div>
        </div>
      )}

      {/* 공통 헤더 + 검색바 + 카테고리 필터 통합 sticky 영역 */}
      <div className="sticky top-0 z-40 bg-white">
        <SharedHeader />

        {/* 검색바 영역 */}
        <div className="border-b border-slate-100 px-4 py-2">
          <div className="max-w-lg mx-auto">
            <SearchBar
              filters={searchFilters}
              onFiltersChange={setSearchFilters}
              onOpenFilterPanel={() => setFilterPanelOpen(true)}
            />
          </div>
        </div>

        {/* 카테고리 필터 영역 (검색 비활성화 시에만 표시) */}
        {!searchActive && (
        <div className="border-b border-slate-100 px-4 py-3">
          <div className="max-w-lg mx-auto">
            {/* 카테고리 필터 */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <Badge
              variant="secondary"
              className={`shrink-0 cursor-pointer px-3 py-1.5 rounded-xl font-medium transition-all ${
                selectedCategory === null
                  ? 'bg-slate-900 text-white hover:bg-slate-800'
                  : 'bg-white text-slate-500 border border-slate-100 shadow-sm hover:bg-slate-50'
              }`}
              onClick={() => setSelectedCategory(null)}
            >
              전체
            </Badge>
            {sortedCategories.map((category) => {
              const total = categoryTotals.get(category) || 0;
              const hasData = total > 0;
              return (
                <Badge
                  key={category}
                  variant="secondary"
                  className={`shrink-0 px-3 py-1.5 rounded-xl font-medium transition-all ${
                    !hasData
                      ? 'bg-slate-50 text-slate-300 border border-slate-100 cursor-not-allowed'
                      : selectedCategory === category
                      ? 'bg-slate-900 text-white hover:bg-slate-800 cursor-pointer'
                      : 'bg-white text-slate-500 border border-slate-100 shadow-sm hover:bg-slate-50 cursor-pointer'
                  }`}
                  onClick={() => hasData && setSelectedCategory(category)}
                >
                  {category}
                </Badge>
              );
            })}
          </div>
        </div>
      </div>
        )}
      </div>

      {/* 요약 카드 (검색 비활성화 시에만 표시) */}
      {!searchActive && (
        !selectedCategory ? (
          <div className="px-5 py-3">
            <div className="max-w-lg mx-auto">
              <SummaryCard
                transactions={allData?.data || []}
                prevMonthTransactions={prevMonthData?.data || []}
              />
            </div>
          </div>
        ) : (
          categoryTotal > 0 && (
            <div className="px-5 py-3">
              <div className="max-w-lg mx-auto bg-white rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[#3182F6]">{selectedCategory}</span>
                  <span className="text-lg font-bold tracking-tight text-[#3182F6]">
                    {formatNumber(categoryTotal)}원
                  </span>
                </div>
              </div>
            </div>
          )
        )
      )}

      {/* 거래 내역 리스트 */}
      <div className="px-5 pb-20">
        <div className="max-w-lg mx-auto">
          <TransactionList
            transactions={transactions}
            isLoading={transactionsLoading}
            onLongPress={handleLongPress}
            onDelete={handleDelete}
            onUploadClick={handleUploadClick}
          />
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
          onClick={() => {
            editFlow.openEdit(null);
          }}
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
        {...editFlow.editModalProps}
      />

      {/* 비슷한 거래 일괄 수정 모달 */}
      {editFlow.similarModalProps && (
        <SimilarTransactionsModal {...editFlow.similarModalProps} />
      )}

      {/* 검색 필터 패널 */}
      <FilterPanel
        open={filterPanelOpen}
        onOpenChange={setFilterPanelOpen}
        filters={searchFilters}
        onApply={setSearchFilters}
      />
    </div>
  );
}
