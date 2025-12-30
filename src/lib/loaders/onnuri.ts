/**
 * 온누리상품권 결제내역 파서
 *
 * 식별 키워드: "거래일자", "가맹점 및 상품권명", "거래금액"
 * 날짜 형식: "YYYYMMDD" (예: "20251008")
 * 상품권이므로 할부 거래 없음
 */

import type { ParsedTransaction, ParseResult, Category } from '@/types';
import type { Parser, ExcelRow } from './types';
import { parseAmount } from '@/lib/utils/validation';

/** 온누리상품권 컬럼 인덱스 */
const COLUMNS = {
  DATE: 0, // 거래일자
  TIME: 1, // 거래시각
  TYPE: 2, // 거래구분 (결제)
  MERCHANT: 3, // 가맹점 및 상품권명
  BIZ_NO: 4, // 사업자번호
  METHOD: 5, // 거래방식 (QR결제, 카드결제, 온라인몰)
  PAYMENT_TYPE: 6, // 거래유형 (단일결제, 복합결제)
  STATUS: 7, // 거래상태 (결제완료)
  AMOUNT: 8, // 거래금액
} as const;

/** 식별 키워드 */
const IDENTIFY_KEYWORDS = ['거래일자', '가맹점 및 상품권명', '거래금액'];

export class OnnuriParser implements Parser {
  sourceType = '온누리' as const;

  /**
   * 온누리상품권 파일인지 확인
   */
  canParse(fileName: string, headers: string[]): boolean {
    // 파일명으로 확인
    const fileNameLower = fileName.toLowerCase();
    if (
      fileNameLower.includes('온누리') ||
      fileNameLower.includes('onnuri')
    ) {
      return true;
    }

    // 헤더로 확인 - 모든 식별 키워드가 있어야 함
    const hasAllKeywords = IDENTIFY_KEYWORDS.every((keyword) =>
      headers.some((h) => h.includes(keyword))
    );

    return hasAllKeywords;
  }

  /**
   * 온누리상품권 결제내역 파싱
   */
  parse(allSheetData: unknown[][], fileName: string): ParseResult {
    const transactions: ParsedTransaction[] = [];

    // 첫 번째 시트 사용 (온누리상품권은 단일 시트)
    const data = allSheetData[0] as ExcelRow[];
    if (!data || data.length === 0) {
      return {
        success: false,
        data: [],
        source_type: this.sourceType,
        total_amount: 0,
        error: '데이터가 없습니다.',
      };
    }

    // 헤더 행 찾기
    const headerRowIndex = this.findHeaderRow(data);
    if (headerRowIndex === -1) {
      return {
        success: false,
        data: [],
        source_type: this.sourceType,
        total_amount: 0,
        error: '헤더를 찾을 수 없습니다.',
      };
    }

    // 데이터 행 파싱
    for (let i = headerRowIndex + 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0) continue;

      // 날짜 추출
      const dateCell = String(row[COLUMNS.DATE] || '').trim();
      if (!dateCell) continue;

      const parsedDate = this.parseOnnuriDate(dateCell);
      if (!parsedDate) continue;

      // 가맹점명 추출
      const merchantCell = String(row[COLUMNS.MERCHANT] || '').trim();
      if (!merchantCell) continue;

      // 거래상태 확인 (결제완료만 처리)
      const statusCell = String(row[COLUMNS.STATUS] || '').trim();
      if (statusCell && statusCell !== '결제완료') continue;

      // 금액 추출
      const amountCell = row[COLUMNS.AMOUNT];
      const amount = parseAmount(amountCell);

      // 금액이 0 이하면 스킵
      if (amount <= 0) continue;

      // 상품권은 할부 없음
      const category: Category = '기타';

      transactions.push({
        date: parsedDate,
        merchant: merchantCell,
        amount,
        category,
        is_installment: false,
      });
    }

    const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);

    return {
      success: true,
      data: transactions,
      source_type: this.sourceType,
      total_amount: totalAmount,
    };
  }

  /**
   * 헤더 행 찾기
   */
  private findHeaderRow(data: ExcelRow[]): number {
    for (let i = 0; i < Math.min(10, data.length); i++) {
      const row = data[i];
      if (!row) continue;

      const rowStr = row.map((c) => String(c || '')).join(' ');
      // 모든 식별 키워드가 포함된 행을 헤더로 인식
      if (
        rowStr.includes('거래일자') &&
        rowStr.includes('가맹점') &&
        rowStr.includes('거래금액')
      ) {
        return i;
      }
    }
    return -1;
  }

  /**
   * 온누리상품권 날짜 형식 파싱 ("20251008" -> "2025-10-08")
   */
  private parseOnnuriDate(dateStr: string): string | null {
    // YYYYMMDD 형식
    const match = dateStr.match(/^(\d{4})(\d{2})(\d{2})$/);
    if (match) {
      const [, year, month, day] = match;
      return `${year}-${month}-${day}`;
    }
    return null;
  }
}
