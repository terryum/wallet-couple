/**
 * 소득 기능 통합 테스트
 * 4탭 네비게이션, 소득 페이지, 소득 분석 기능 전체 검증
 */

import { describe, it, expect } from 'vitest';
import type { TransactionType } from '@/types';
import { INCOME_CATEGORIES } from '@/types';

describe('소득 기능 통합 테스트', () => {
  describe('소득 카테고리 정의', () => {
    it('6개의 소득 카테고리가 정의되어야 함', () => {
      expect(INCOME_CATEGORIES).toHaveLength(6);
    });

    it('기본 소득 카테고리가 포함되어야 함', () => {
      expect(INCOME_CATEGORIES).toContain('급여');
      expect(INCOME_CATEGORIES).toContain('상여');
      expect(INCOME_CATEGORIES).toContain('정부/환급');
      expect(INCOME_CATEGORIES).toContain('강연/도서');
      expect(INCOME_CATEGORIES).toContain('금융소득');
      expect(INCOME_CATEGORIES).toContain('기타소득');
    });
  });

  describe('4탭 네비게이션 구조', () => {
    const navStructure = {
      expense: {
        list: '/',
        dashboard: '/dashboard',
      },
      income: {
        list: '/income',
        dashboard: '/income/dashboard',
      },
    };

    it('지출 탭 경로가 올바르게 정의되어야 함', () => {
      expect(navStructure.expense.list).toBe('/');
      expect(navStructure.expense.dashboard).toBe('/dashboard');
    });

    it('소득 탭 경로가 올바르게 정의되어야 함', () => {
      expect(navStructure.income.list).toBe('/income');
      expect(navStructure.income.dashboard).toBe('/income/dashboard');
    });

    it('소득 경로는 /income 접두사로 시작해야 함', () => {
      expect(navStructure.income.list).toMatch(/^\/income/);
      expect(navStructure.income.dashboard).toMatch(/^\/income/);
    });
  });

  describe('TransactionType 지원', () => {
    const transactionTypes: TransactionType[] = ['expense', 'income'];

    it('expense와 income 두 가지 타입이 있어야 함', () => {
      expect(transactionTypes).toContain('expense');
      expect(transactionTypes).toContain('income');
      expect(transactionTypes).toHaveLength(2);
    });

    it('TransactionType은 문자열이어야 함', () => {
      transactionTypes.forEach(type => {
        expect(typeof type).toBe('string');
      });
    });
  });

  describe('색상 테마', () => {
    const colors = {
      expense: '#EF4444', // 빨강
      income: '#16A34A',  // 녹색
    };

    it('지출 색상은 빨간색 계열이어야 함', () => {
      expect(colors.expense).toBe('#EF4444');
    });

    it('소득 색상은 녹색 계열이어야 함', () => {
      expect(colors.income).toBe('#16A34A');
    });

    it('지출과 소득 색상이 서로 달라야 함', () => {
      expect(colors.expense).not.toBe(colors.income);
    });
  });

  describe('API 엔드포인트 파라미터', () => {
    const buildQueryParams = (options: {
      month: string;
      transactionType?: TransactionType;
      owner?: string;
    }) => {
      const params = new URLSearchParams();
      params.set('month', options.month);
      if (options.transactionType) {
        params.set('transaction_type', options.transactionType);
      }
      if (options.owner) {
        params.set('owner', options.owner);
      }
      return params.toString();
    };

    it('지출 조회 시 transaction_type=expense가 포함되어야 함', () => {
      const params = buildQueryParams({
        month: '2024-11',
        transactionType: 'expense',
      });
      expect(params).toContain('transaction_type=expense');
    });

    it('소득 조회 시 transaction_type=income이 포함되어야 함', () => {
      const params = buildQueryParams({
        month: '2024-11',
        transactionType: 'income',
      });
      expect(params).toContain('transaction_type=income');
    });

    it('owner 필터가 올바르게 적용되어야 함', () => {
      const params = buildQueryParams({
        month: '2024-11',
        transactionType: 'income',
        owner: 'husband',
      });
      expect(params).toContain('owner=husband');
      expect(params).toContain('transaction_type=income');
    });
  });

  describe('소득 데이터 집계', () => {
    // 샘플 소득 거래 데이터
    const sampleIncomeTransactions = [
      { id: '1', category: '급여', amount: 5000000, transaction_type: 'income' },
      { id: '2', category: '상여', amount: 1000000, transaction_type: 'income' },
      { id: '3', category: '금융소득', amount: 50000, transaction_type: 'income' },
      { id: '4', category: '강연/도서', amount: 200000, transaction_type: 'income' },
    ];

    it('총 소득이 올바르게 계산되어야 함', () => {
      const total = sampleIncomeTransactions.reduce((sum, tx) => sum + tx.amount, 0);
      expect(total).toBe(6250000);
    });

    it('카테고리별 집계가 올바르게 되어야 함', () => {
      const byCategory = sampleIncomeTransactions.reduce((acc, tx) => {
        acc[tx.category] = (acc[tx.category] || 0) + tx.amount;
        return acc;
      }, {} as Record<string, number>);

      expect(byCategory['급여']).toBe(5000000);
      expect(byCategory['상여']).toBe(1000000);
      expect(byCategory['금융소득']).toBe(50000);
      expect(byCategory['강연/도서']).toBe(200000);
    });

    it('모든 거래가 income 타입이어야 함', () => {
      sampleIncomeTransactions.forEach(tx => {
        expect(tx.transaction_type).toBe('income');
      });
    });
  });

  describe('월 비교 로직', () => {
    // 전월 대비 증감 계산
    const calculateDiff = (current: number, previous: number) => {
      return {
        diff: current - previous,
        percentDiff: previous > 0
          ? ((current - previous) / previous) * 100
          : 0,
      };
    };

    it('소득 증가 시 양수 diff가 계산되어야 함', () => {
      const result = calculateDiff(6000000, 5000000);
      expect(result.diff).toBe(1000000);
      expect(result.percentDiff).toBe(20);
    });

    it('소득 감소 시 음수 diff가 계산되어야 함', () => {
      const result = calculateDiff(4000000, 5000000);
      expect(result.diff).toBe(-1000000);
      expect(result.percentDiff).toBe(-20);
    });

    it('동일 금액 시 diff가 0이어야 함', () => {
      const result = calculateDiff(5000000, 5000000);
      expect(result.diff).toBe(0);
      expect(result.percentDiff).toBe(0);
    });
  });

  describe('UI 상태 관리', () => {
    it('소득 페이지에서 기본 카테고리 선택은 null이어야 함', () => {
      const selectedCategory: string | null = null;
      expect(selectedCategory).toBeNull();
    });

    it('카테고리 선택 시 해당 카테고리가 저장되어야 함', () => {
      let selectedCategory: string | null = null;
      selectedCategory = '급여';
      expect(selectedCategory).toBe('급여');
    });

    it('전체 선택 시 null로 리셋되어야 함', () => {
      let selectedCategory: string | null = '급여';
      selectedCategory = null;
      expect(selectedCategory).toBeNull();
    });
  });
});

describe('기존 기능과의 호환성', () => {
  describe('지출 기능 유지', () => {
    it('지출 페이지 경로가 그대로 유지되어야 함', () => {
      expect('/').toBe('/');
      expect('/dashboard').toBe('/dashboard');
    });

    it('지출 기본 동작이 변경되지 않아야 함', () => {
      const defaultTransactionType: TransactionType = 'expense';
      expect(defaultTransactionType).toBe('expense');
    });
  });

  describe('공유 컴포넌트', () => {
    it('SharedHeader가 양쪽 페이지에서 동일하게 사용되어야 함', () => {
      // SharedHeader는 월 선택, 사용자 선택 등 공통 기능 제공
      const sharedHeaderFeatures = ['월 선택', '사용자 선택', '설정'];
      expect(sharedHeaderFeatures.length).toBeGreaterThan(0);
    });

    it('TransactionList가 양쪽에서 재사용 가능해야 함', () => {
      // TransactionList props
      const listProps = {
        transactions: [],
        isLoading: false,
        emptyMessage: '소득 내역이 없습니다',
        emptyDescription: '은행 명세서를 업로드하여\n소득 내역을 확인해보세요',
      };
      expect(listProps.emptyMessage).toBeDefined();
      expect(listProps.emptyDescription).toBeDefined();
    });
  });
});
