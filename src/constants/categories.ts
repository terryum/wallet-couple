/**
 * 카테고리 그룹 상수
 * SummaryCard 등에서 하드코딩된 카테고리명 중앙화
 */

import type { Category } from '@/types';

/**
 * 소득 카테고리 그룹
 * SummaryCard에서 소득 요약 표시에 사용
 */
export const INCOME_GROUPS = {
  /** 급여 + 상여 (정기 수입) */
  salaryBonus: ['급여', '상여'] as const,
  /** 강연/도서 (부수입) */
  lecture: ['강연/도서'] as const,
  /** 기타 소득 */
  etc: ['정부/환급', '금융소득', '기타소득'] as const,
} as const;

/**
 * 지출 카테고리 그룹
 * SummaryCard에서 지출 요약 표시에 사용
 */
export const EXPENSE_GROUPS = {
  /** 가족 관련 (부모님 + 육아) */
  family: ['부모님', '육아'] as const,
  /** 고정 지출 (관리비, 양육비, 대출이자) */
  fixed: ['관리비', '양육비', '대출이자'] as const,
} as const;

/**
 * 일반 요약에서 제외할 카테고리 (특별히 표시되므로)
 */
export const EXCLUDED_FROM_GENERAL: readonly Category[] = [
  '부모님',
  '육아',
  '관리비',
  '양육비',
  '대출이자',
] as const;

/**
 * 카테고리가 특정 그룹에 속하는지 확인
 */
export function isInCategoryGroup(
  category: Category,
  group: readonly string[]
): boolean {
  return group.includes(category);
}

/**
 * 거래 목록에서 특정 그룹의 합계 계산
 */
export function sumCategoryGroup<T extends { category: Category; amount: number }>(
  transactions: T[],
  group: readonly string[]
): number {
  return transactions
    .filter((t) => group.includes(t.category))
    .reduce((sum, t) => sum + t.amount, 0);
}
