import type { Category, ParsedTransaction } from '@/types';
import type { ClassifyInput } from '@/lib/classifier';

export type ClassificationMode = 'all' | 'defaultOnly';

export interface ClassificationPrep {
  expenseInputs: ClassifyInput[];
  incomeInputs: ClassifyInput[];
  installmentIndices: Set<number>;
  presetIndices: Set<number>;
}

/**
 * 분류 대상 입력 준비
 * - all: 설치(기존할부) 제외하고 전체 분류
 * - defaultOnly: 기본 카테고리(기타/기타소득)만 분류
 */
export function prepareClassificationInputs(
  items: ParsedTransaction[],
  mode: ClassificationMode
): ClassificationPrep {
  const expenseInputs: ClassifyInput[] = [];
  const incomeInputs: ClassifyInput[] = [];
  const installmentIndices = new Set<number>();
  const presetIndices = new Set<number>();

  items.forEach((item, idx) => {
    if (item.is_installment === true || item.category === '기존할부') {
      installmentIndices.add(idx);
      return;
    }

    const isIncome = item.transaction_type === 'income';
    const isDefault =
      (isIncome && item.category === '기타소득') ||
      (!isIncome && item.category === '기타');

    if (mode === 'defaultOnly' && !isDefault) {
      presetIndices.add(idx);
      return;
    }

    const input = { index: idx, merchant: item.merchant, amount: item.amount };
    if (isIncome) {
      incomeInputs.push(input);
    } else {
      expenseInputs.push(input);
    }
  });

  return { expenseInputs, incomeInputs, installmentIndices, presetIndices };
}

/**
 * 지출/소득 분류 결과를 하나의 맵으로 병합
 */
export function mergeCategoryMaps(
  expenseMap: Map<number, Category>,
  incomeMap: Map<number, Category>
): Map<number, Category> {
  const merged = new Map<number, Category>();
  expenseMap.forEach((value, key) => merged.set(key, value));
  incomeMap.forEach((value, key) => merged.set(key, value));
  return merged;
}
