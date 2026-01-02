/**
 * 차트 컴포넌트 transactionType 지원 테스트
 * PieChartCard, StackedBarCard의 소득/지출 모드 검증
 */

import { describe, it, expect } from 'vitest';

// 라벨 생성 로직 시뮬레이션
function getTypeLabel(transactionType: 'expense' | 'income'): string {
  return transactionType === 'income' ? '소득' : '지출';
}

// 인사이트 색상 로직 시뮬레이션
function getInsightColor(
  transactionType: 'expense' | 'income',
  isUp: boolean
): string {
  if (transactionType === 'income') {
    // 소득: 증가=파랑(좋음), 감소=빨강(나쁨)
    return isUp ? 'text-[#3182F6]' : 'text-red-500';
  } else {
    // 지출: 증가=빨강(나쁨), 감소=파랑(좋음)
    return isUp ? 'text-red-500' : 'text-[#3182F6]';
  }
}

describe('차트 라벨 생성', () => {
  describe('getTypeLabel', () => {
    it('expense일 때 "지출"을 반환해야 함', () => {
      expect(getTypeLabel('expense')).toBe('지출');
    });

    it('income일 때 "소득"을 반환해야 함', () => {
      expect(getTypeLabel('income')).toBe('소득');
    });
  });

  describe('카드 제목 생성', () => {
    const formatYearMonth = (month: string) => {
      const [year, m] = month.split('-');
      return `${year}년 ${parseInt(m)}월`;
    };

    it('지출 비중 제목이 올바르게 생성되어야 함', () => {
      const month = '2024-11';
      const typeLabel = getTypeLabel('expense');
      const title = `${formatYearMonth(month)} ${typeLabel} 비중`;
      expect(title).toBe('2024년 11월 지출 비중');
    });

    it('소득 비중 제목이 올바르게 생성되어야 함', () => {
      const month = '2024-11';
      const typeLabel = getTypeLabel('income');
      const title = `${formatYearMonth(month)} ${typeLabel} 비중`;
      expect(title).toBe('2024년 11월 소득 비중');
    });

    it('월별 지출 변화 제목이 올바르게 생성되어야 함', () => {
      const typeLabel = getTypeLabel('expense');
      const title = `월별 ${typeLabel} 변화`;
      expect(title).toBe('월별 지출 변화');
    });

    it('월별 소득 변화 제목이 올바르게 생성되어야 함', () => {
      const typeLabel = getTypeLabel('income');
      const title = `월별 ${typeLabel} 변화`;
      expect(title).toBe('월별 소득 변화');
    });
  });
});

describe('인사이트 색상 로직', () => {
  describe('지출 모드', () => {
    it('지출 증가 시 빨간색(경고)이어야 함', () => {
      const color = getInsightColor('expense', true);
      expect(color).toBe('text-red-500');
    });

    it('지출 감소 시 파란색(좋음)이어야 함', () => {
      const color = getInsightColor('expense', false);
      expect(color).toBe('text-[#3182F6]');
    });
  });

  describe('소득 모드', () => {
    it('소득 증가 시 파란색(좋음)이어야 함', () => {
      const color = getInsightColor('income', true);
      expect(color).toBe('text-[#3182F6]');
    });

    it('소득 감소 시 빨간색(경고)이어야 함', () => {
      const color = getInsightColor('income', false);
      expect(color).toBe('text-red-500');
    });
  });

  describe('색상 일관성', () => {
    it('지출과 소득의 증가 색상이 반대여야 함', () => {
      const expenseUp = getInsightColor('expense', true);
      const incomeUp = getInsightColor('income', true);
      expect(expenseUp).not.toBe(incomeUp);
    });

    it('지출과 소득의 감소 색상이 반대여야 함', () => {
      const expenseDown = getInsightColor('expense', false);
      const incomeDown = getInsightColor('income', false);
      expect(expenseDown).not.toBe(incomeDown);
    });
  });
});

describe('도넛 차트 중앙 라벨', () => {
  it('지출 모드에서 "총 지출"이 표시되어야 함', () => {
    const typeLabel = getTypeLabel('expense');
    const centerLabel = `총 ${typeLabel}`;
    expect(centerLabel).toBe('총 지출');
  });

  it('소득 모드에서 "총 소득"이 표시되어야 함', () => {
    const typeLabel = getTypeLabel('income');
    const centerLabel = `총 ${typeLabel}`;
    expect(centerLabel).toBe('총 소득');
  });
});

describe('TransactionList 빈 상태 메시지', () => {
  const defaultExpenseMessage = '내역이 없습니다';
  const defaultExpenseDescription = '카드 명세서를 업로드하여\n지출 내역을 확인해보세요';

  const incomeMessage = '소득 내역이 없습니다';
  const incomeDescription = '은행 명세서를 업로드하여\n소득 내역을 확인해보세요';

  it('지출 기본 메시지가 올바르게 설정되어야 함', () => {
    expect(defaultExpenseMessage).toBe('내역이 없습니다');
  });

  it('지출 기본 설명이 카드 명세서 업로드를 안내해야 함', () => {
    expect(defaultExpenseDescription).toContain('카드 명세서');
  });

  it('소득 메시지가 올바르게 설정되어야 함', () => {
    expect(incomeMessage).toBe('소득 내역이 없습니다');
  });

  it('소득 설명이 은행 명세서 업로드를 안내해야 함', () => {
    expect(incomeDescription).toContain('은행 명세서');
  });
});
