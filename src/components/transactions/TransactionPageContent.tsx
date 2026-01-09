/**
 * 지출/소득 공통 페이지 컴포넌트
 * 두 탭이 완벽히 동일한 UI/UX를 공유
 */

'use client';

import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { Plus, Upload, Search } from 'lucide-react';
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
import { useTransactions, useInfiniteTransactions, useDeleteTransaction } from '@/hooks/useTransactions';
import {
  useSearchTransactions,
  isSearchActive,
  DEFAULT_FILTERS,
} from '@/hooks/useSearchTransactions';
import { useTransactionEditFlow } from '@/hooks/useTransactionEditFlow';
import { formatNumber } from '@/lib/utils/format';
import type { Transaction, Category, SearchFilters } from '@/types';

type TransactionType = 'expense' | 'income';

/** 이전 월 계산 */
function getPrevMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split('-').map(Number);
  const date = new Date(year, month - 2, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

interface TransactionPageContentProps {
  /** 거래 유형: expense 또는 income */
  transactionType: TransactionType;
  /** 표시할 카테고리 목록 */
  categories: readonly string[];
  /** 모달 ID 접두사 */
  modalIdBase: string;
}

export function TransactionPageContent({
  transactionType,
  categories,
  modalIdBase,
}: TransactionPageContentProps) {
  const fileUploaderRef = useRef<FileUploaderRef>(null);
  const savedScrollPositionRef = useRef<number | null>(null);

  // 전역 상태
  const { selectedMonth, selectedOwner, currentUser } = useAppContext();

  // 로컬 상태
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchFilters, setSearchFilters] = useState<SearchFilters>(DEFAULT_FILTERS);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const searchActive = isSearchActive(searchFilters);

  const editFlow = useTransactionEditFlow({
    owner: currentUser,
    openSimilarDelayMs: 50,
    modalIdBase,
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
    transactionType: 'all',
  });

  // 이전 월 데이터 조회 (SummaryCard 증감 비교용)
  const { data: prevMonthAllData } = useTransactions({
    month: prevMonth,
    owner: selectedOwner || undefined,
    includeSummary: true,
    transactionType: 'all',
  });

  // 선택된 카테고리 데이터 조회 (무한 스크롤)
  const {
    data: infiniteData,
    isLoading,
    hasNextPage,
    isFetchingNextPage,
    loadMore,
    totalCount,
  } = useInfiniteTransactions(
    {
      month: selectedMonth,
      owner: selectedOwner || undefined,
      category: (selectedCategory as Category) || undefined,
      includeSummary: true,
      transactionType,
    },
    { pageSize: 30 } // 첫 로드 시 30건만
  );

  // 검색 데이터 조회 (검색 활성화 시)
  const { data: searchData, isLoading: searchLoading } = useSearchTransactions(
    searchFilters,
    {
      enabled: searchActive,
      currentMonth: selectedMonth,
      owner: selectedOwner,
    }
  );

  // 카테고리별 합계 금액 계산
  const categoryTotals = useMemo(() => {
    const allTransactions = allData?.data || [];
    // 해당 거래 유형만 필터링
    const filteredTransactions = allTransactions.filter((tx) =>
      transactionType === 'income'
        ? tx.transaction_type === 'income'
        : tx.transaction_type !== 'income'
    );
    const totals = new Map<string, number>();

    filteredTransactions.forEach((tx) => {
      if (categories.includes(tx.category)) {
        const current = totals.get(tx.category) || 0;
        totals.set(tx.category, current + tx.amount);
      }
    });

    return totals;
  }, [allData, transactionType, categories]);

  // 정렬된 카테고리 목록: 금액순 → 0원은 가나다순
  const sortedCategories = useMemo(() => {
    const withAmount: string[] = [];
    const withoutAmount: string[] = [];

    categories.forEach((category) => {
      const total = categoryTotals.get(category) || 0;
      if (total > 0) {
        withAmount.push(category);
      } else {
        withoutAmount.push(category);
      }
    });

    withAmount.sort((a, b) => {
      const aTotal = categoryTotals.get(a) || 0;
      const bTotal = categoryTotals.get(b) || 0;
      return bTotal - aTotal;
    });

    withoutAmount.sort((a, b) => a.localeCompare(b, 'ko'));

    return [...withAmount, ...withoutAmount];
  }, [categories, categoryTotals]);

  // 삭제 뮤테이션
  const { mutate: deleteTransaction } = useDeleteTransaction();

  // 필터된 거래 내역 (검색 활성화 시 검색 결과 사용)
  const transactions = useMemo(() => {
    if (searchActive) {
      return searchData?.data || [];
    }
    return infiniteData || [];
  }, [searchActive, searchData, infiniteData]);

  // 로딩 상태
  const transactionsLoading = searchActive ? searchLoading : isLoading;

  // 선택된 카테고리의 총 금액
  const categoryTotal = useMemo(() => {
    if (!selectedCategory || !transactions.length) return 0;
    return transactions.reduce((sum, tx) => sum + tx.amount, 0);
  }, [selectedCategory, transactions]);

  // 모달이 닫히고 데이터가 갱신된 후 스크롤 위치 복원
  useEffect(() => {
    // 모달(EditModal 또는 SimilarTransactionsModal)이 열려있으면 복원하지 않음
    if (editFlow.isSubModalOpen || savedScrollPositionRef.current === null) {
      return;
    }

    const timeoutId = setTimeout(() => {
      if (savedScrollPositionRef.current !== null) {
        window.scrollTo({ top: savedScrollPositionRef.current, behavior: 'instant' });
        savedScrollPositionRef.current = null;
      }
    }, 150); // 데이터 갱신 후 DOM 업데이트 대기

    return () => clearTimeout(timeoutId);
  }, [editFlow.isSubModalOpen, transactions]);

  // 행 클릭 (편집)
  const handleLongPress = (transaction: Transaction) => {
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

      {/* 공통 헤더 + 카테고리 필터 통합 sticky 영역 */}
      <div className="sticky top-0 z-40 bg-white">
        <SharedHeader />

        {/* 카테고리 필터 영역 + 검색 아이콘 */}
        <div className="border-b border-slate-100 px-4 py-3">
          <div className="max-w-lg mx-auto">
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {/* 검색 아이콘 버튼 */}
              <button
                onClick={() => setSearchExpanded(!searchExpanded)}
                className={`shrink-0 w-9 h-9 flex items-center justify-center rounded-xl transition-all ${
                  searchExpanded || searchActive
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-slate-500 border border-slate-100 shadow-sm hover:bg-slate-50'
                }`}
              >
                <Search className="w-4 h-4" />
              </button>

              {/* 카테고리 필터 (검색 비활성화 시에만 표시) */}
              {!searchActive && (
                <>
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
                </>
              )}
            </div>
          </div>
        </div>

        {/* 검색바 영역 (펼쳐진 상태일 때만 표시) */}
        {searchExpanded && (
          <div className="border-b border-slate-100 px-4 py-2 bg-slate-50">
            <div className="max-w-lg mx-auto">
              <SearchBar
                filters={searchFilters}
                onFiltersChange={setSearchFilters}
                onOpenFilterPanel={() => setFilterPanelOpen(true)}
              />
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
                prevMonthTransactions={prevMonthAllData?.data || []}
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
            hasNextPage={!searchActive && hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            onLoadMore={loadMore}
            totalCount={!searchActive ? totalCount : undefined}
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
