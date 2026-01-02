/**
 * 소득 내역 페이지
 * 지출 내역 페이지와 동일한 구조, 소득 데이터만 표시
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
  type FileUploaderRef,
} from '@/components/transactions';
import { SharedHeader, SharedBottomNav } from '@/components/layout';
import { useAppContext } from '@/contexts/AppContext';
import { useTransactions, useDeleteTransaction } from '@/hooks/useTransactions';
import { useTransactionEditFlow } from '@/hooks/useTransactionEditFlow';
import { formatNumber } from '@/lib/utils/format';
import type { Transaction, IncomeCategory } from '@/types';
import { INCOME_CATEGORIES } from '@/types';

// 소득용 색상
const INCOME_COLOR = '#16A34A';

/** 이전 월 계산 */
function getPrevMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split('-').map(Number);
  const date = new Date(year, month - 2, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/** 만원 단위로 포맷팅 */
function formatInMan(amount: number): string {
  const man = Math.round(amount / 10000);
  return `${man.toLocaleString()}만원`;
}

export default function IncomePage() {
  const fileUploaderRef = useRef<FileUploaderRef>(null);
  const savedScrollPositionRef = useRef<number | null>(null);

  // 전역 상태
  const { selectedMonth, selectedOwner, currentUser } = useAppContext();

  // 로컬 상태
  const [selectedCategory, setSelectedCategory] = useState<IncomeCategory | null>(null);

  const editFlow = useTransactionEditFlow({
    owner: currentUser,
    openSimilarDelayMs: 50,
    modalIdBase: 'income',
  });

  // 드래그 앤 드롭 상태
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);

  // 이전 월 계산
  const prevMonth = useMemo(() => getPrevMonth(selectedMonth), [selectedMonth]);

  // 소득 데이터 조회
  const { data: incomeData, isLoading } = useTransactions({
    month: selectedMonth,
    owner: selectedOwner || undefined,
    category: selectedCategory || undefined,
    includeSummary: true,
    transactionType: 'income',
  });

  // 이전 월 소득 데이터 조회 (비교용)
  const { data: prevMonthData } = useTransactions({
    month: prevMonth,
    owner: selectedOwner || undefined,
    includeSummary: true,
    transactionType: 'income',
  });

  // 카테고리별 합계 금액 계산
  const categoryTotals = useMemo(() => {
    const allTransactions = incomeData?.data || [];
    const totals = new Map<IncomeCategory, number>();

    allTransactions.forEach((tx) => {
      if (INCOME_CATEGORIES.includes(tx.category as IncomeCategory)) {
        const current = totals.get(tx.category as IncomeCategory) || 0;
        totals.set(tx.category as IncomeCategory, current + tx.amount);
      }
    });

    return totals;
  }, [incomeData]);

  // 정렬된 카테고리 목록: 금액순 → 0원은 가나다순
  const sortedCategories = useMemo(() => {
    const withAmount: IncomeCategory[] = [];
    const withoutAmount: IncomeCategory[] = [];

    INCOME_CATEGORIES.forEach((category) => {
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
  }, [categoryTotals]);

  // 삭제 뮤테이션
  const { mutate: deleteTransaction } = useDeleteTransaction();

  // 거래 내역
  const transactions = useMemo(() => {
    return incomeData?.data || [];
  }, [incomeData]);

  // 총 소득
  const totalIncome = useMemo(() => {
    return transactions.reduce((sum, tx) => sum + tx.amount, 0);
  }, [transactions]);

  // 이전 월 총 소득
  const prevTotalIncome = useMemo(() => {
    return (prevMonthData?.data || []).reduce((sum, tx) => sum + tx.amount, 0);
  }, [prevMonthData]);

  // 선택된 카테고리의 총 금액
  const categoryTotal = useMemo(() => {
    if (!selectedCategory || !transactions.length) return 0;
    return transactions.reduce((sum, tx) => sum + tx.amount, 0);
  }, [selectedCategory, transactions]);

  // 모달이 닫히고 데이터가 갱신된 후 스크롤 위치 복원
  useEffect(() => {
    if (editFlow.editModalOpen || savedScrollPositionRef.current === null) {
      return;
    }

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

  // 소득 증감 계산
  const incomeDiff = totalIncome - prevTotalIncome;
  const diffText = incomeDiff !== 0
    ? `${incomeDiff > 0 ? '+' : ''}${Math.round(incomeDiff / 10000).toLocaleString()}만`
    : '';

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
        <div className="fixed inset-0 bg-green-500/10 backdrop-blur-sm z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-white rounded-3xl p-8 shadow-2xl border-2 border-dashed border-green-500 flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-green-500/10 flex items-center justify-center">
              <Upload className="w-8 h-8 text-green-500" />
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

        {/* 카테고리 필터 영역 */}
        <div className="border-b border-slate-100 px-4 py-3">
          <div className="max-w-lg mx-auto">
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              <Badge
                variant="secondary"
                className={`shrink-0 cursor-pointer px-3 py-1.5 rounded-xl font-medium transition-all ${
                  selectedCategory === null
                    ? 'bg-green-600 text-white hover:bg-green-700'
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
                        ? 'bg-green-600 text-white hover:bg-green-700 cursor-pointer'
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
      </div>

      {/* 소득 요약 카드 */}
      {!selectedCategory ? (
        <div className="px-5 py-3">
          <div className="max-w-lg mx-auto bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium" style={{ color: INCOME_COLOR }}>이번 달 총 소득</span>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-bold tracking-tight text-slate-900">
                  {formatNumber(totalIncome)}원
                </span>
                {diffText && (
                  <span className={`text-xs ${incomeDiff > 0 ? 'text-blue-500' : 'text-red-500'}`}>
                    ({diffText})
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        categoryTotal > 0 && (
          <div className="px-5 py-3">
            <div className="max-w-lg mx-auto bg-white rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium" style={{ color: INCOME_COLOR }}>{selectedCategory}</span>
                <span className="text-lg font-bold tracking-tight" style={{ color: INCOME_COLOR }}>
                  {formatNumber(categoryTotal)}원
                </span>
              </div>
            </div>
          </div>
        )
      )}

      {/* 거래 내역 리스트 */}
      <div className="px-5 pb-20">
        <div className="max-w-lg mx-auto">
          <TransactionList
            transactions={transactions}
            isLoading={isLoading}
            onLongPress={handleLongPress}
            onDelete={handleDelete}
            onUploadClick={handleUploadClick}
            emptyMessage="소득 내역이 없습니다"
            emptyDescription="은행 명세서를 업로드하여\n소득 내역을 확인해보세요"
          />
        </div>
      </div>

      {/* 플로팅 액션 버튼 - 하단 중앙 */}
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 flex gap-3 z-50">
        <button
          onClick={handleUploadClick}
          className="flex items-center gap-2 px-4 py-3 bg-green-600 text-white rounded-2xl shadow-lg hover:bg-green-700 active:scale-95 transition-all"
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
          className="flex items-center gap-2 px-4 py-3 bg-green-600 text-white rounded-2xl shadow-lg hover:bg-green-700 active:scale-95 transition-all"
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
    </div>
  );
}
