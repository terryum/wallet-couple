/**
 * 현대카드 명세서 파서
 *
 * 식별 키워드: "결제원금", "할부/회차"
 * 날짜 형식: "2025년 08월 14일"
 * 특이사항: 가맹점명에 금액이 붙어있는 경우가 있음
 * 검증: 파싱한 모든 금액의 합계가 "총 합계" 행의 결제원금과 일치해야 함
 */

import type { ParsedTransaction, ParseResult, Category } from '@/types';
import type { Parser, ExcelRow } from './types';
import { parseAmount } from '@/lib/utils/validation';

/** 현대카드 컬럼 인덱스 */
const COLUMNS = {
  DATE: 0, // 이용일
  CARD: 1, // 이용카드
  MERCHANT: 2, // 이용가맹점
  AMOUNT: 3, // 이용금액 (비어있는 경우 많음)
  INSTALLMENT: 4, // 할부/회차
  DISCOUNT_RATE: 5, // 적립/할인율
  DISCOUNT_AMOUNT: 6, // 예상적립/할인
  PAYMENT_AMOUNT: 7, // 결제원금
  BALANCE: 8, // 결제후잔액
  INTEREST: 9, // 수수료(이자)
} as const;

export class HyundaiParser implements Parser {
  sourceType = '현대카드' as const;

  /**
   * 현대카드 파일인지 확인
   */
  canParse(fileName: string, headers: string[]): boolean {
    // 파일명으로 확인
    const fileNameLower = fileName.toLowerCase();
    if (
      fileNameLower.includes('hyundai') ||
      fileNameLower.includes('현대')
    ) {
      return true;
    }

    // 헤더로 확인 - 결제원금과 할부/회차가 둘 다 있어야 함
    const hasPaymentAmount = headers.some((h) => h.includes('결제원금'));
    const hasInstallment = headers.some((h) => h.includes('할부/회차'));

    return hasPaymentAmount && hasInstallment;
  }

  /**
   * 현대카드 명세서 파싱
   */
  parse(allSheetData: unknown[][], fileName: string): ParseResult {
    const data = allSheetData[0] as ExcelRow[];

    if (!data || data.length === 0) {
      return {
        success: false,
        data: [],
        source_type: this.sourceType,
        total_amount: 0,
        error: '데이터가 비어있습니다.',
      };
    }

    // 헤더 행 찾기 (결제원금이 포함된 행)
    const headerRowIndex = this.findHeaderRow(data);
    if (headerRowIndex === -1) {
      return {
        success: false,
        data: [],
        source_type: this.sourceType,
        total_amount: 0,
        error: '헤더 행을 찾을 수 없습니다.',
      };
    }

    // "총 합계" 행에서 파일 합계 추출
    const fileTotalInfo = this.findFileTotalRow(data, headerRowIndex);

    // 기존할부 섹션 범위 찾기 ("해외이용소계" 다음 ~ "할부소계" 전)
    const installmentRange = this.findInstallmentRange(data, headerRowIndex);

    const transactions: ParsedTransaction[] = [];
    let currentDate: string | null = null;

    // 데이터 행 파싱 (헤더 다음 행부터, 총 합계 행 전까지)
    const endRowIndex = fileTotalInfo?.rowIndex ?? data.length;

    for (let i = headerRowIndex + 1; i < endRowIndex; i++) {
      const row = data[i];
      if (!row || row.length === 0) continue;

      // 날짜 추출 또는 이전 날짜 사용
      const dateCell = String(row[COLUMNS.DATE] || '').trim();
      if (dateCell) {
        const parsedDate = this.parseHyundaiDate(dateCell);
        if (parsedDate) {
          currentDate = parsedDate;
        }
      }

      if (!currentDate) continue;

      // 가맹점명 추출
      const merchantCell = String(row[COLUMNS.MERCHANT] || '').trim();
      if (!merchantCell) continue;

      // 할인/적립 관련 행 스킵 (소계, 합계 등)
      const merchant = this.extractMerchantName(merchantCell);
      if (this.isDiscountRow(merchant)) continue;

      // 금액 추출 (음수 포함하여 모두 가져옴)
      const amount = this.extractAmountWithSign(row, merchantCell);

      // 금액이 0이면 스킵 (음수는 검증을 위해 유지)
      if (amount === 0) continue;

      // 기존할부 여부 확인:
      // "해외이용소계" ~ "할부소계" 범위 내에 있으면 기존할부
      // (할부/회차 컬럼이 비어있는 경우가 많아 형식 확인 생략)
      const isInstallment = installmentRange !== null &&
        i > installmentRange.startRow &&
        i < installmentRange.endRow;

      // 카테고리 결정
      const category: Category = isInstallment ? '기존할부' : '기타';

      transactions.push({
        date: currentDate,
        merchant,
        amount,
        category,
        is_installment: isInstallment,
      });
    }

    // 파싱한 금액 합계 계산 (음수 포함)
    const parsedTotalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);

    // 검증: 파일 합계와 파싱 합계 비교
    if (fileTotalInfo) {
      const fileTotal = fileTotalInfo.total;
      if (parsedTotalAmount !== fileTotal) {
        return {
          success: false,
          data: [],
          source_type: this.sourceType,
          total_amount: 0,
          error: `데이터 로딩에 오류가 있습니다.\n파일명: ${fileName}\n파일 합계: ${fileTotal.toLocaleString()}원\n로딩 합계: ${parsedTotalAmount.toLocaleString()}원`,
        };
      }
    }

    // 검증 통과 후 금액이 0 이하인 행 제거
    const validTransactions = transactions.filter((t) => t.amount > 0);
    const totalAmount = validTransactions.reduce((sum, t) => sum + t.amount, 0);

    return {
      success: true,
      data: validTransactions,
      source_type: this.sourceType,
      total_amount: totalAmount,
      billing_total: fileTotalInfo?.total, // 이용대금명세서상의 청구 총액
    };
  }

  /**
   * 기존할부 섹션 범위 찾기
   * "해외이용소계" 행 다음부터 "할부소계" 행 전까지
   * 주의: 키워드에 공백이 포함될 수 있음 (예: "해 외 이 용 소계")
   */
  private findInstallmentRange(
    data: ExcelRow[],
    headerRowIndex: number
  ): { startRow: number; endRow: number } | null {
    let startRow = -1;
    let endRow = -1;

    for (let i = headerRowIndex + 1; i < data.length; i++) {
      const row = data[i];
      if (!row) continue;

      // 공백을 모두 제거하고 키워드 검색
      const rowStrNoSpace = row.map((c) => String(c || '')).join('').replace(/\s+/g, '');

      // "해외이용소계" 찾기 (할부 섹션 시작 직전)
      if (rowStrNoSpace.includes('해외이용소계')) {
        startRow = i;
      }

      // "할부소계" 찾기 (할부 섹션 끝)
      if (rowStrNoSpace.includes('할부소계')) {
        endRow = i;
        break;
      }
    }

    // 둘 다 찾은 경우에만 반환
    if (startRow !== -1 && endRow !== -1 && startRow < endRow) {
      return { startRow, endRow };
    }

    return null;
  }

  /**
   * 헤더 행 찾기
   */
  private findHeaderRow(data: ExcelRow[]): number {
    for (let i = 0; i < Math.min(10, data.length); i++) {
      const row = data[i];
      if (!row) continue;

      const rowStr = row.map((c) => String(c || '')).join(' ');
      if (rowStr.includes('결제원금') && rowStr.includes('이용일')) {
        return i;
      }
    }
    return -1;
  }

  /**
   * "총 합계" 행 찾기 및 결제원금 추출
   * 파일 끝 부분에서 "총 합계"가 포함된 행을 찾음
   */
  private findFileTotalRow(
    data: ExcelRow[],
    headerRowIndex: number
  ): { rowIndex: number; total: number } | null {
    // 뒤에서부터 검색 (마지막 15행 내에서)
    for (let i = data.length - 1; i >= Math.max(headerRowIndex + 1, data.length - 15); i--) {
      const row = data[i];
      if (!row) continue;

      const rowStr = row.map((c) => String(c || '')).join(' ');
      // "총 합계" 또는 "총합계" 패턴 찾기
      if (rowStr.includes('총 합계') || rowStr.includes('총합계')) {
        // 1. 먼저 고정 인덱스에서 시도
        let totalAmount = this.parseAmountWithSign(row[COLUMNS.PAYMENT_AMOUNT]);

        // 2. 고정 인덱스가 0이면 뒤에서부터 찾기
        if (totalAmount === 0) {
          totalAmount = this.findPaymentAmountFromEnd(row);
        }

        return { rowIndex: i, total: totalAmount };
      }
    }
    return null;
  }

  /**
   * 현대카드 날짜 형식 파싱 ("2025년 08월 14일" -> "2025-08-14")
   */
  parseHyundaiDate(dateStr: string): string | null {
    const match = dateStr.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
    if (!match) return null;

    const [, year, month, day] = match;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  /**
   * 부호 포함 금액 파싱 (음수도 처리)
   */
  private parseAmountWithSign(value: unknown): number {
    if (value === null || value === undefined) return 0;

    // 숫자인 경우
    if (typeof value === 'number') {
      return Math.round(value);
    }

    // 문자열인 경우
    const str = String(value).trim();
    if (!str) return 0;

    // 음수 확인
    const isNegative = str.startsWith('-') || str.startsWith('△') || str.startsWith('▲');

    // 숫자만 추출
    const numStr = str.replace(/[^\d]/g, '');
    if (!numStr) return 0;

    const amount = parseInt(numStr, 10);
    return isNegative ? -amount : amount;
  }

  /**
   * 금액 추출 (부호 포함, 음수도 가져옴)
   * 검증을 위해 음수 금액도 포함하여 반환
   *
   * 현대카드 파일 구조 (실제 분석 결과):
   * - 일반 거래: 결제원금(인덱스7)이 0이고, 예상적립/할인(인덱스6)에 실제 결제금액이 있음
   * - 소계/합계: 인덱스7에 합계가 있음
   * - 할부: 인덱스6, 7 모두에 값이 있을 수 있음
   * - 맨 끝 2개(인덱스8, 9)는 항상 0
   *
   * 주의: 인덱스6, 7이 모두 0인 경우 가맹점명에서 금액을 추출하지 않음
   * - "민생회복 소비쿠폰"으로 전액 할인된 거래는 금액 컬럼이 모두 0
   * - 이런 경우 다음 행에 할인 금액이 있지만 skip 되므로 추출하면 안 됨
   */
  private extractAmountWithSign(row: ExcelRow, merchantCell: string): number {
    // 1. 인덱스 6 (예상적립/할인)에서 시도 - 이번 달 실제 결제할 금액
    //    할부의 경우 인덱스 7은 전체 금액, 인덱스 6이 이번 달 결제할 금액
    const paymentAmountIdx6 = this.parseAmountWithSign(row[COLUMNS.DISCOUNT_AMOUNT]);
    if (paymentAmountIdx6 !== 0) {
      return paymentAmountIdx6;
    }

    // 2. 인덱스 7 (결제원금)에서 시도 - 소계/합계 행 또는 일부 특수 케이스
    const paymentAmountIdx7 = this.parseAmountWithSign(row[COLUMNS.PAYMENT_AMOUNT]);
    if (paymentAmountIdx7 !== 0) {
      return paymentAmountIdx7;
    }

    // 3. 뒤에서부터 찾기 (컬럼 수가 다를 경우 대비)
    const paymentAmountFromEnd = this.findPaymentAmountFromEnd(row);
    if (paymentAmountFromEnd !== 0) {
      return paymentAmountFromEnd;
    }

    // 4. 인덱스 6, 7이 모두 0이면 가맹점명에서 추출하지 않음
    //    (전액 할인 거래, 결제 취소 등의 경우 다음 행과 상쇄되어야 함)
    return 0;
  }

  /**
   * 뒤에서부터 결제원금 찾기
   * 맨 끝 2개가 0이면, 그 앞에서 0이 아닌 첫 번째 값을 찾음
   * 주의: 가맹점명(인덱스 2) 이하는 검색하지 않음
   */
  private findPaymentAmountFromEnd(row: ExcelRow): number {
    if (row.length < 4) return 0;

    // 맨 끝 2개 값 확인
    const lastValue = this.parseAmountWithSign(row[row.length - 1]);
    const secondLastValue = this.parseAmountWithSign(row[row.length - 2]);

    // 맨 끝 2개가 모두 0인 경우
    if (lastValue === 0 && secondLastValue === 0) {
      // 뒤에서 3번째부터 0이 아닌 값 찾기
      // 단, 인덱스 4 이하까지만 검색 (가맹점명, 이용금액 컬럼 제외)
      const minIndex = Math.max(4, row.length - 6);
      for (let i = row.length - 3; i >= minIndex; i--) {
        const value = this.parseAmountWithSign(row[i]);
        if (value !== 0) {
          return value;
        }
      }
    }

    return 0;
  }

  /**
   * 가맹점명에서 금액 추출 (양수만)
   * 예: "우지커피판교w시티점3,300" -> 3300
   * 예: "귀의달인4,500,000" -> 4500000
   */
  private extractAmountFromMerchant(merchantStr: string): number {
    // 끝에 있는 숫자 패턴 찾기 (콤마 포함)
    const match = merchantStr.match(/([\d,]+)$/);
    if (match) {
      return parseAmount(match[1]);
    }
    return 0;
  }

  /**
   * 가맹점명에서 금액 추출 (음수 포함)
   * 예: "우지커피판교w시티점3,300" -> 3300
   * 예: "네이버페이-34,540" -> -34540
   * 예: "귀의달인4,500,000" -> 4500000
   *
   * 주의: 가맹점명에 택시 번호판 등 숫자가 포함된 경우 오류 방지를 위해
   * 100만원(1,000,000) 이상의 금액은 무시함
   */
  private extractAmountFromMerchantWithSign(merchantStr: string): number {
    const MAX_MERCHANT_AMOUNT = 1000000; // 100만원 한도

    // 끝에 있는 음수 숫자 패턴 먼저 체크 (예: "-34,540")
    const negativeMatch = merchantStr.match(/(-[\d,]+)$/);
    if (negativeMatch) {
      const numStr = negativeMatch[1].replace(/[^\d]/g, '');
      if (numStr) {
        const amount = parseInt(numStr, 10);
        // 100만원 이하만 유효한 것으로 간주
        if (amount <= MAX_MERCHANT_AMOUNT) {
          return -amount;
        }
        return 0;
      }
    }

    // 끝에 있는 양수 숫자 패턴 찾기 (콤마 포함)
    const positiveMatch = merchantStr.match(/([\d,]+)$/);
    if (positiveMatch) {
      const amount = parseAmount(positiveMatch[1]);
      // 100만원 이하만 유효한 것으로 간주
      if (amount <= MAX_MERCHANT_AMOUNT) {
        return amount;
      }
      return 0;
    }

    return 0;
  }

  /**
   * 가맹점명 추출 (금액이 붙어있는 경우 제거)
   * 예: "우지커피판교w시티점3,300" -> "우지커피판교w시티점"
   */
  extractMerchantName(merchantStr: string): string {
    // 끝에 숫자,콤마,마침표가 있으면 제거
    let cleaned = merchantStr
      .replace(/[\d,]+\.{0,3}$/, '') // 끝의 숫자와 ... 제거
      .replace(/\s+/g, ' ')
      .trim();

    // 음수 금액도 제거 (예: "-3300")
    cleaned = cleaned.replace(/-[\d,]+$/, '').trim();

    return cleaned || merchantStr;
  }

  /**
   * 할인/적립 또는 합계 행인지 확인
   */
  private isDiscountRow(merchant: string): boolean {
    const skipKeywords = [
      '소비쿠폰',
      '청구할인',
      '상품권사용',
      '민생회복',
      '할인',
      '소계',
      '합계',
    ];
    return skipKeywords.some((keyword) => merchant.includes(keyword));
  }

  /**
   * 할부 거래인지 확인
   * 할부/회차 컬럼에 분수 형태(예: "9/7")가 있으면 할부
   */
  private isInstallmentTransaction(installmentStr: string): boolean {
    if (!installmentStr) return false;

    // 분수 형태 확인 (예: "9/7", "3/12")
    if (/\d+\/\d+/.test(installmentStr)) {
      return true;
    }

    // 숫자만 있는 경우도 할부로 간주
    if (/^\d+$/.test(installmentStr)) {
      return true;
    }

    return false;
  }
}
