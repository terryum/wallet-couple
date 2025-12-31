/**
 * 차트 관련 공유 상수
 */

import type { Category } from '@/types';

/** 카테고리별 색상 */
export const CATEGORY_COLORS: Record<string, string> = {
  식료품: '#22c55e',
  '외식/커피': '#f97316',
  쇼핑: '#ec4899',
  관리비: '#64748b',
  '통신/교통': '#3b82f6',
  육아: '#eab308',
  '병원/미용': '#a855f7',
  기존할부: '#ef4444',
  대출이자: '#dc2626',
  양육비: '#14b8a6',
  세금: '#7c3aed',
  여행: '#06b6d4',
  부모님: '#f59e0b',
  '친구/동료': '#6366f1',
  '경조사/선물': '#f43f5e',
  '가전/가구': '#10b981',
  기타: '#9ca3af',
  'etc.': '#9ca3af',
};

/** 최소 표시 카테고리 수 */
export const MIN_CATEGORIES = 5;

/** 최대 표시 카테고리 수 */
export const MAX_CATEGORIES = 7;

/**
 * 카테고리 색상 반환
 */
export function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] || CATEGORY_COLORS['기타'];
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
