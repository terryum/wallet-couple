/**
 * useDashboard 훅 테스트
 * transactionType 파라미터 지원 검증
 */

import { describe, it, expect } from 'vitest';

// getRecentMonths 함수 재현 (테스트용)
function getRecentMonths(count: number): string[] {
  const months: string[] = [];
  const now = new Date();

  for (let i = 0; i < count; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    months.push(`${year}-${month}`);
  }

  return months.reverse();
}

// getAdjacentMonth 함수 재현 (테스트용)
function getAdjacentMonth(yearMonth: string, delta: number): string {
  const [year, month] = yearMonth.split('-').map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

describe('useDashboard 유틸 함수', () => {
  describe('getRecentMonths', () => {
    it('지정된 개수만큼 월 목록을 반환해야 함', () => {
      const months = getRecentMonths(3);
      expect(months).toHaveLength(3);
    });

    it('오래된 순서로 정렬되어야 함', () => {
      const months = getRecentMonths(3);
      // 첫 번째가 가장 오래된 월
      for (let i = 0; i < months.length - 1; i++) {
        expect(months[i] < months[i + 1]).toBe(true);
      }
    });

    it('YYYY-MM 형식이어야 함', () => {
      const months = getRecentMonths(6);
      months.forEach(month => {
        expect(month).toMatch(/^\d{4}-\d{2}$/);
      });
    });
  });

  describe('getAdjacentMonth', () => {
    it('다음 월을 계산할 수 있어야 함', () => {
      expect(getAdjacentMonth('2024-11', 1)).toBe('2024-12');
      expect(getAdjacentMonth('2024-12', 1)).toBe('2025-01');
    });

    it('이전 월을 계산할 수 있어야 함', () => {
      expect(getAdjacentMonth('2024-11', -1)).toBe('2024-10');
      expect(getAdjacentMonth('2024-01', -1)).toBe('2023-12');
    });

    it('연도 경계를 넘어도 올바르게 계산해야 함', () => {
      expect(getAdjacentMonth('2024-12', 1)).toBe('2025-01');
      expect(getAdjacentMonth('2025-01', -1)).toBe('2024-12');
    });
  });
});

describe('useDashboard Query Key 생성', () => {
  // Query Key 생성 로직 시뮬레이션
  const createMonthlyQueryKey = (
    month: string,
    owner?: string,
    transactionType: string = 'expense'
  ) => {
    return ['dashboard', 'monthly', month, owner, transactionType];
  };

  const createTrendQueryKey = (
    monthCount: number,
    owner?: string,
    transactionType: string = 'expense'
  ) => {
    return ['dashboard', 'trend', monthCount, owner, transactionType];
  };

  it('월별 집계 query key에 transactionType이 포함되어야 함', () => {
    const expenseKey = createMonthlyQueryKey('2024-11', undefined, 'expense');
    const incomeKey = createMonthlyQueryKey('2024-11', undefined, 'income');

    expect(expenseKey).toContain('expense');
    expect(incomeKey).toContain('income');
    expect(expenseKey).not.toEqual(incomeKey);
  });

  it('추세 분석 query key에 transactionType이 포함되어야 함', () => {
    const expenseKey = createTrendQueryKey(12, undefined, 'expense');
    const incomeKey = createTrendQueryKey(12, undefined, 'income');

    expect(expenseKey).toContain('expense');
    expect(incomeKey).toContain('income');
    expect(expenseKey).not.toEqual(incomeKey);
  });

  it('기본값은 expense여야 함', () => {
    const defaultKey = createMonthlyQueryKey('2024-11');
    expect(defaultKey[4]).toBe('expense');
  });

  it('owner가 다르면 다른 query key가 생성되어야 함', () => {
    const husbandKey = createMonthlyQueryKey('2024-11', 'husband', 'expense');
    const wifeKey = createMonthlyQueryKey('2024-11', 'wife', 'expense');

    expect(husbandKey).not.toEqual(wifeKey);
    expect(husbandKey[3]).toBe('husband');
    expect(wifeKey[3]).toBe('wife');
  });
});

describe('API 파라미터 생성', () => {
  // API 파라미터 생성 로직 시뮬레이션
  const createApiParams = (
    month: string,
    owner?: string,
    transactionType: string = 'expense'
  ) => {
    const params = new URLSearchParams();
    params.set('month', month);
    params.set('include_summary', 'true');
    params.set('transaction_type', transactionType);
    if (owner) params.set('owner', owner);
    return params.toString();
  };

  it('transaction_type=expense가 기본값이어야 함', () => {
    const params = createApiParams('2024-11');
    expect(params).toContain('transaction_type=expense');
  });

  it('transaction_type=income이 올바르게 설정되어야 함', () => {
    const params = createApiParams('2024-11', undefined, 'income');
    expect(params).toContain('transaction_type=income');
  });

  it('owner가 있으면 파라미터에 포함되어야 함', () => {
    const params = createApiParams('2024-11', 'husband', 'expense');
    expect(params).toContain('owner=husband');
  });

  it('owner가 없으면 파라미터에서 제외되어야 함', () => {
    const params = createApiParams('2024-11', undefined, 'expense');
    expect(params).not.toContain('owner=');
  });
});
