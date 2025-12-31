/**
 * 직접입력 엑셀 파서
 * 사용자가 직접 입력한 내역을 관리하는 엑셀 파일 파싱
 */

import type { ParseResult, ParsedTransaction, Category, ALL_CATEGORIES } from '@/types';
import type { Parser, ExcelRow } from './types';

/** 직접입력 엑셀 헤더 */
export const MANUAL_ENTRY_HEADERS = ['날짜', '이용처', '금액', '카테고리', '메모'];

/** 유효한 카테고리 목록 */
const VALID_CATEGORIES: readonly string[] = [
  '식료품', '외식/커피', '쇼핑', '관리비', '통신/교통', '육아', '병원/미용',
  '기존할부', '대출이자', '양육비', '세금', '여행', '부모님', '친구/동료', '경조사/선물',
  '가전/가구', '기타',
];

/**
 * 날짜 문자열 정규화 (다양한 형식 지원)
 */
function normalizeDate(dateStr: string | number): string | null {
  if (!dateStr) return null;

  // 숫자형 (엑셀 날짜 시리얼)
  if (typeof dateStr === 'number') {
    const date = new Date((dateStr - 25569) * 86400 * 1000);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const str = String(dateStr).trim();

  // YYYY-MM-DD 형식
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // YYYY.MM.DD 또는 YYYY/MM/DD 형식
  const match1 = str.match(/^(\d{4})[./](\d{1,2})[./](\d{1,2})$/);
  if (match1) {
    return `${match1[1]}-${match1[2].padStart(2, '0')}-${match1[3].padStart(2, '0')}`;
  }

  // MM/DD/YYYY 또는 MM-DD-YYYY 형식
  const match2 = str.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (match2) {
    return `${match2[3]}-${match2[1].padStart(2, '0')}-${match2[2].padStart(2, '0')}`;
  }

  return null;
}

/**
 * 금액 문자열을 숫자로 변환
 */
function parseAmount(value: string | number): number {
  if (typeof value === 'number') {
    return Math.abs(Math.round(value));
  }

  const str = String(value).replace(/[,원\s]/g, '');
  const num = parseInt(str, 10);
  return isNaN(num) ? 0 : Math.abs(num);
}

/**
 * 카테고리 검증 및 정규화
 */
function normalizeCategory(value: string | number | null | undefined): Category {
  if (!value) return '기타';

  const str = String(value).trim();
  if (VALID_CATEGORIES.includes(str)) {
    return str as Category;
  }

  return '기타';
}

/**
 * 파일명에서 (숫자) 패턴 제거하여 정규화
 * 예: "남편_직접입력(1).xlsx" -> "남편_직접입력.xlsx"
 * 예: "아내_직접입력 (2).xls" -> "아내_직접입력.xls"
 */
function normalizeFileName(fileName: string): string {
  // " (숫자)" 또는 "(숫자)" 패턴 제거
  return fileName.replace(/\s*\(\d+\)/g, '');
}

export class ManualEntryParser implements Parser {
  readonly sourceType = '직접입력' as const;

  canParse(fileName: string, headers: string[]): boolean {
    // 파일명 정규화 (중복 다운로드로 인한 (1), (2) 등 제거)
    const normalizedFileName = normalizeFileName(fileName);

    // 파일명이 "직접입력"을 포함하거나, 헤더가 정확히 일치하는 경우
    const isManualFile = normalizedFileName.includes('직접입력');
    const hasManualHeaders = MANUAL_ENTRY_HEADERS.every((h) =>
      headers.some((header) => header.includes(h))
    );

    return isManualFile || hasManualHeaders;
  }

  parse(allData: ExcelRow[][], fileName: string): ParseResult {
    // 첫 번째 시트 사용
    const data = allData[0] || [];

    if (data.length === 0) {
      return {
        success: true,
        data: [],
        source_type: this.sourceType,
        total_amount: 0,
      };
    }

    // 헤더 행 찾기
    let headerRowIndex = -1;
    let columnIndices: {
      date: number;
      merchant: number;
      amount: number;
      category: number;
      memo: number;
    } | null = null;

    for (let i = 0; i < Math.min(10, data.length); i++) {
      const row = data[i];
      if (!Array.isArray(row)) continue;

      const rowStr = row.map((c) => String(c || '').trim());

      const dateIdx = rowStr.findIndex((c) => c === '날짜');
      const merchantIdx = rowStr.findIndex((c) => c === '이용처');
      const amountIdx = rowStr.findIndex((c) => c === '금액');
      const categoryIdx = rowStr.findIndex((c) => c === '카테고리');
      const memoIdx = rowStr.findIndex((c) => c === '메모');

      if (dateIdx >= 0 && merchantIdx >= 0 && amountIdx >= 0) {
        headerRowIndex = i;
        columnIndices = {
          date: dateIdx,
          merchant: merchantIdx,
          amount: amountIdx,
          category: categoryIdx >= 0 ? categoryIdx : -1,
          memo: memoIdx >= 0 ? memoIdx : -1,
        };
        break;
      }
    }

    if (headerRowIndex < 0 || !columnIndices) {
      return {
        success: false,
        data: [],
        source_type: this.sourceType,
        total_amount: 0,
        error: '직접입력 파일의 헤더를 찾을 수 없습니다. (날짜, 이용처, 금액 필수)',
      };
    }

    // 데이터 행 파싱
    const transactions: ParsedTransaction[] = [];
    let totalAmount = 0;

    for (let i = headerRowIndex + 1; i < data.length; i++) {
      const row = data[i];
      if (!Array.isArray(row)) continue;

      const dateValue = row[columnIndices.date];
      const merchantValue = row[columnIndices.merchant];
      const amountValue = row[columnIndices.amount];
      const categoryValue = columnIndices.category >= 0 ? row[columnIndices.category] : null;

      // 빈 행 스킵
      if (!dateValue && !merchantValue && !amountValue) continue;

      // 날짜 파싱
      const date = normalizeDate(dateValue as string | number);
      if (!date) continue;

      // 이용처
      const merchant = String(merchantValue || '').trim();
      if (!merchant) continue;

      // 금액
      const amount = parseAmount(amountValue as string | number);
      if (amount <= 0) continue;

      // 카테고리
      const category = normalizeCategory(categoryValue);

      transactions.push({
        date,
        merchant,
        amount,
        category,
        is_installment: false,
      });

      totalAmount += amount;
    }

    return {
      success: true,
      data: transactions,
      source_type: this.sourceType,
      total_amount: totalAmount,
    };
  }
}
