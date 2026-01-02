/**
 * 차트 관련 공유 상수
 * 색상은 colors.ts에서 중앙 관리
 */

import type { Category } from '@/types';
import {
  chartColors,
  getCategoryColor as getColor,
} from './colors';

/** 카테고리별 색상 (colors.ts에서 import) */
export const CATEGORY_COLORS = chartColors;

/** 최소 표시 카테고리 수 */
export const MIN_CATEGORIES = 5;

/** 최대 표시 카테고리 수 */
export const MAX_CATEGORIES = 7;

/**
 * 카테고리 색상 반환 (colors.ts 위임)
 */
export function getCategoryColor(category: string): string {
  return getColor(category);
}

/**
 * 카테고리 데이터 인터페이스
 */
export interface CategoryData {
  category: Category;
  total_amount: number;
  count?: number;
}

/**
 * 차트 데이터 인터페이스
 */
export interface ChartCategoryData {
  name: string;
  value: number;
  percentage: number;
  color: string;
  count?: number;
  [key: string]: string | number | undefined;
}

/**
 * 카테고리 계산 결과 인터페이스
 */
export interface CategoryCalculationResult {
  chartData: ChartCategoryData[];
  topCategories: string[];
  etcCategories: string[];
  etcTotal: number;
}
