/**
 * 입력 검증 유틸리티 함수
 */

import { ALL_CATEGORIES, type Category } from '@/types';

/**
 * 카테고리 유효성 검증
 * @param category - 검증할 카테고리 문자열
 * @returns 유효한 카테고리인지 여부
 */
export function isValidCategory(category: string): category is Category {
  return ALL_CATEGORIES.includes(category as Category);
}

/**
 * 날짜 형식 유효성 검증 (YYYY-MM-DD)
 * @param date - 검증할 날짜 문자열
 * @returns 유효한 날짜인지 여부
 */
export function isValidDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return false;
  }

  const [year, month, day] = date.split('-').map(Number);
  const dateObj = new Date(year, month - 1, day);

  return (
    dateObj.getFullYear() === year &&
    dateObj.getMonth() === month - 1 &&
    dateObj.getDate() === day
  );
}

/**
 * 월 형식 유효성 검증 (YYYY-MM)
 * @param month - 검증할 월 문자열
 * @returns 유효한 월인지 여부
 */
export function isValidMonth(month: string): boolean {
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return false;
  }

  const [year, m] = month.split('-').map(Number);
  return year >= 2000 && year <= 2100 && m >= 1 && m <= 12;
}

/**
 * 금액 유효성 검증
 * @param amount - 검증할 금액
 * @returns 유효한 금액인지 여부 (양의 정수)
 */
export function isValidAmount(amount: number): boolean {
  return Number.isInteger(amount) && amount > 0;
}

/**
 * 문자열에서 숫자만 추출 (금액 파싱용)
 * @param str - 파싱할 문자열 (예: "1,234,567원" 또는 "₩1,234,567")
 * @returns 추출된 숫자 또는 0 (파싱 실패 시)
 */
export function parseAmount(
  str: string | number | null | undefined
): number {
  if (str === null || str === undefined) return 0;

  if (typeof str === 'number') {
    return Math.floor(str);
  }

  if (!str) return 0;

  // 숫자와 음수 기호만 추출
  const numStr = String(str).replace(/[^0-9-]/g, '');
  const parsed = parseInt(numStr, 10);

  return isNaN(parsed) ? 0 : parsed;
}

/**
 * 가맹점명 정규화 (공백 정리, 불필요한 문자 제거)
 * @param name - 원본 가맹점명
 * @returns 정규화된 가맹점명
 */
export function normalizeMerchantName(name: string): string {
  if (!name) return '';

  return name
    .trim()
    .replace(/\s+/g, ' ') // 연속 공백을 단일 공백으로
    .replace(/[^\w\s가-힣().-]/g, ''); // 허용된 문자만 유지
}
