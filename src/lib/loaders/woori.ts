/**
 * 우리은행 거래내역 데이터 로더
 *
 * 파일 형식: xls (HTML 테이블 형식)
 * 헤더: No., 거래일시, 적요, 기재내용, 찾으신금액, 맡기신금액, 거래후 잔액, 취급기관, 메모
 *
 * 입금(소득): 맡기신금액 > 0, 찾으신금액 = 0
 * 출금(지출): 찾으신금액 > 0, 맡기신금액 = 0
 */

import type { ParsedTransaction, ParseResult, Category } from '@/types';
import type { Parser } from './types';

/** 우리은행 컬럼 인덱스 */
const COLUMNS = {
  NO: 0,
  DATE_TIME: 1,
  SUMMARY: 2,        // 적요
  DESCRIPTION: 3,    // 기재내용
  WITHDRAWAL: 4,     // 찾으신금액 (출금)
  DEPOSIT: 5,        // 맡기신금액 (입금)
  BALANCE: 6,        // 거래후 잔액
  BRANCH: 7,         // 취급기관
  MEMO: 8,           // 메모
} as const;

/** 입금(소득) 제외 패턴 */
const INCOME_SKIP_PATTERNS = [
  '1002798840223',      // 본인 다른 계좌
  '*엄태웅*',           // 본인 이름
  '*최유경*',           // 배우자 이름
  '*예금결산이자*',     // 예금 이자
];

/** 출금(지출) 제외 패턴 */
const EXPENSE_SKIP_PATTERNS = [
  '1002798840223',      // 본인 다른 계좌
  '*최유경*',           // 배우자 이름
  '엄태웅',             // 본인 이름 (정확히)
  '한국엄태웅',         // 본인 이름
  '온누리충전',         // 상품권 충전 (다른 로더에서 처리)
  '온누리자동충전',
  '성남사랑상품권',
  '*카드*',             // 카드 결제 (다른 로더에서 처리)
  'AMA 입금스윙',       // 투자 이체
  '엄태웅청약*',        // 청약
];

/** 소득 카테고리 매핑 */
const INCOME_CATEGORY_PATTERNS: Array<{ pattern: string; category: Category }> = [
  { pattern: '*월급여', category: '급여' },
  { pattern: '*상여', category: '상여' },
  { pattern: '코스맥스(주)', category: '상여' },
  { pattern: '*환급*', category: '정부/환급' },
];

/** 지출 카테고리 매핑 */
const EXPENSE_CATEGORY_PATTERNS: Array<{ pattern: string; category: Category }> = [
  // 대출이자
  { pattern: '토뱅엄태웅', category: '대출이자' },
  { pattern: '*이자*', category: '대출이자' },
  // 양육비
  { pattern: '*박찬하*', category: '양육비' },
  // 세금 (국세, 지방세, 교통범칙금 등)
  { pattern: '*경찰청*', category: '세금' },
  { pattern: '*인천서구*', category: '세금' },
  { pattern: '*68저*', category: '세금' },
  { pattern: '*179호*', category: '세금' },
  { pattern: '*국세*', category: '세금' },
  { pattern: '*지방세*', category: '세금' },
  { pattern: '*자동차세*', category: '세금' },
  { pattern: '*재산세*', category: '세금' },
  { pattern: '*주민세*', category: '세금' },
  // 쇼핑
  { pattern: '*네이버페이충전*', category: '쇼핑' },
  { pattern: '*당근페이*', category: '쇼핑' },
];

/** 기본 소득 카테고리 */
const DEFAULT_INCOME_CATEGORY: Category = '강연/도서';

/** 기본 지출 카테고리 */
const DEFAULT_EXPENSE_CATEGORY: Category = '기타';

/** 최소 금액 (이하는 무시) */
const MIN_AMOUNT = 5000;

/**
 * 와일드카드 패턴 매칭
 * '*' = 임의의 문자열
 */
function matchPattern(text: string, pattern: string): boolean {
  if (!text || !pattern) return false;

  const normalizedText = text.trim().toLowerCase();
  const normalizedPattern = pattern.trim().toLowerCase();

  // 와일드카드가 없으면 정확히 일치
  if (!normalizedPattern.includes('*')) {
    return normalizedText === normalizedPattern;
  }

  // 와일드카드를 정규식으로 변환
  const regexPattern = normalizedPattern
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*');

  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(normalizedText);
}

/**
 * 패턴 목록 중 하나라도 매칭되는지 확인
 */
function matchAnyPattern(text: string, patterns: string[]): boolean {
  return patterns.some(pattern => matchPattern(text, pattern));
}

/**
 * 카테고리 패턴 매핑
 */
function getCategoryFromPatterns(
  text: string,
  patterns: Array<{ pattern: string; category: Category }>,
  defaultCategory: Category
): Category {
  for (const { pattern, category } of patterns) {
    if (matchPattern(text, pattern)) {
      return category;
    }
  }
  return defaultCategory;
}

/**
 * 날짜 파싱 (2025.12.31 08:39 -> 2025-12-31)
 */
function parseDate(dateStr: string): string {
  if (!dateStr) return '';

  // "2025.12.31 08:39" 형식
  const match = dateStr.match(/(\d{4})\.(\d{2})\.(\d{2})/);
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`;
  }

  return '';
}

/**
 * 적요(summary)에서 이용처 이름 결정
 * - CD 거래(ATM 인출)인 경우 "ATM 인출"로 표시
 */
function getMerchantName(summary: string, description: string): string {
  // 적요에 "CD"가 포함되어 있으면 ATM 인출
  if (summary.toUpperCase().includes('CD')) {
    return 'ATM 인출';
  }
  return description || summary;
}

/**
 * 헤더 행 인덱스 찾기
 */
function findHeaderRowIndex(data: unknown[][]): number {
  for (let i = 0; i < Math.min(10, data.length); i++) {
    const row = data[i];
    if (!row) continue;
    const rowStr = (row as (string | number)[]).map(c => String(c)).join(' ');
    if (rowStr.includes('거래일시') && rowStr.includes('적요') && rowStr.includes('기재내용')) {
      return i;
    }
  }
  return -1;
}

export class WooriParser implements Parser {
  sourceType = '우리은행' as const;

  canParse(fileName: string, headers: string[]): boolean {
    // 파일명 체크
    const lowerFileName = fileName.toLowerCase();
    if (lowerFileName.includes('거래내역') && lowerFileName.includes('.xls')) {
      return true;
    }

    // 헤더 체크
    const headerStr = headers.join(' ');
    if (
      headerStr.includes('거래내역조회') ||
      (headerStr.includes('거래일시') && headerStr.includes('찾으신금액') && headerStr.includes('맡기신금액'))
    ) {
      return true;
    }

    return false;
  }

  parse(allData: unknown[][][], fileName: string): ParseResult {
    const transactions: ParsedTransaction[] = [];
    let totalAmount = 0;

    // 첫 번째 시트만 처리
    const data = allData[0];
    if (!data || data.length === 0) {
      return {
        success: false,
        data: [],
        source_type: this.sourceType,
        total_amount: 0,
        error: '데이터가 없습니다.',
      };
    }

    const headerRowIdx = findHeaderRowIndex(data as unknown[][]);
    if (headerRowIdx < 0) {
      return {
        success: false,
        data: [],
        source_type: this.sourceType,
        total_amount: 0,
        error: '헤더 행을 찾을 수 없습니다.',
      };
    }

    // 데이터 행 처리
    for (let i = headerRowIdx + 1; i < data.length; i++) {
      const row = data[i] as (string | number)[];
      if (!row || row.length < 6) continue;

      const dateTime = String(row[COLUMNS.DATE_TIME] || '');
      const summary = String(row[COLUMNS.SUMMARY] || '');
      const description = String(row[COLUMNS.DESCRIPTION] || '');
      const withdrawal = Number(row[COLUMNS.WITHDRAWAL]) || 0;
      const deposit = Number(row[COLUMNS.DEPOSIT]) || 0;

      // 날짜 파싱
      const date = parseDate(dateTime);
      if (!date) continue;

      // 이용처 결정 (CD 거래 → ATM 인출)
      const merchant = getMerchantName(summary, description);

      // 입금 (소득)
      if (deposit > 0 && withdrawal === 0) {
        if (deposit < MIN_AMOUNT) continue;
        if (matchAnyPattern(description, INCOME_SKIP_PATTERNS)) continue;

        const category = getCategoryFromPatterns(
          description,
          INCOME_CATEGORY_PATTERNS,
          DEFAULT_INCOME_CATEGORY
        );

        transactions.push({
          date,
          merchant,
          amount: deposit,
          category,
          is_installment: false,
          transaction_type: 'income',
        });

        totalAmount += deposit;
      }
      // 출금 (지출)
      else if (withdrawal > 0 && deposit === 0) {
        if (withdrawal < MIN_AMOUNT) continue;
        if (matchAnyPattern(description, EXPENSE_SKIP_PATTERNS)) continue;

        const category = getCategoryFromPatterns(
          description,
          EXPENSE_CATEGORY_PATTERNS,
          DEFAULT_EXPENSE_CATEGORY
        );

        transactions.push({
          date,
          merchant,
          amount: withdrawal,
          category,
          is_installment: false,
          transaction_type: 'expense',
        });

        totalAmount += withdrawal;
      }
    }

    return {
      success: true,
      data: transactions,
      source_type: this.sourceType,
      total_amount: totalAmount,
    };
  }
}
