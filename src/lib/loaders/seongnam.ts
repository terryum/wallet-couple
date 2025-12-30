/**
 * 성남사랑상품권 결제내역 파서
 *
 * 식별 키워드: "거래일시", "사용처", "거래금액"
 * 날짜 형식: "YYYY-MM-DD HH:MM:SS" (예: "2025-10-30 16:09:03")
 * 상품권이므로 할부 거래 없음
 * 파일명에 "chak" 포함 (성남사랑상품권 앱 이름)
 *
 * 주의: 파일이 비밀번호로 보호되어 있음 (사용자 생년월일 8자리)
 */

import type { ParsedTransaction, ParseResult, Category } from '@/types';
import type { Parser, ExcelRow } from './types';
import { parseAmount } from '@/lib/utils/validation';

/** 성남사랑상품권 컬럼 인덱스 */
const COLUMNS = {
  SEQ: 0, // 순번
  CARD_NAME: 1, // 상품권명
  DATE: 2, // 거래일시
  STATUS: 3, // 거래구분 (결제완료)
  METHOD: 4, // 거래방법
  MERCHANT: 5, // 사용처
  AMOUNT: 6, // 거래금액
  BALANCE: 7, // 잔고
} as const;

/** 식별 키워드 */
const IDENTIFY_KEYWORDS = ['거래일시', '사용처', '거래금액'];

export class SeongnamParser implements Parser {
  sourceType = '성남사랑' as const;

  /**
   * 성남사랑상품권 파일인지 확인
   */
  canParse(fileName: string, headers: string[]): boolean {
    // 파일명으로 확인 (chak은 성남사랑상품권 앱 이름)
    const fileNameLower = fileName.toLowerCase();
    if (
      fileNameLower.includes('chak') ||
      fileNameLower.includes('성남사랑') ||
      fileNameLower.includes('seongnam')
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
   * 성남사랑상품권 결제내역 파싱
   */
  parse(allSheetData: unknown[][], fileName: string): ParseResult {
    const transactions: ParsedTransaction[] = [];

    // 첫 번째 시트 사용
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

    // 데이터 행 파싱 (헤더 다음 행이 서브헤더일 수 있으므로 +2)
    const dataStartRow = this.findDataStartRow(data, headerRowIndex);

    for (let i = dataStartRow; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0) continue;

      // 순번이 숫자가 아니면 스킵 (데이터 행이 아님)
      const seqCell = row[COLUMNS.SEQ];
      if (typeof seqCell !== 'number') continue;

      // 거래일시 추출
      const dateCell = String(row[COLUMNS.DATE] || '').trim();
      if (!dateCell) continue;

      const parsedDate = this.parseSeongnamDate(dateCell);
      if (!parsedDate) continue;

      // 사용처 추출
      const merchantCell = String(row[COLUMNS.MERCHANT] || '').trim();
      if (!merchantCell) continue;

      // 거래구분 확인 (결제완료만 처리)
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
    for (let i = 0; i < Math.min(15, data.length); i++) {
      const row = data[i];
      if (!row) continue;

      const rowStr = row.map((c) => String(c || '')).join(' ');
      // 모든 식별 키워드가 포함된 행을 헤더로 인식
      if (
        rowStr.includes('거래일시') &&
        rowStr.includes('사용처') &&
        rowStr.includes('거래금액')
      ) {
        return i;
      }
    }
    return -1;
  }

  /**
   * 데이터 시작 행 찾기 (서브헤더가 있을 수 있음)
   */
  private findDataStartRow(data: ExcelRow[], headerRowIndex: number): number {
    // 헤더 다음 행부터 확인하여 숫자 순번이 시작되는 행 찾기
    for (let i = headerRowIndex + 1; i < Math.min(headerRowIndex + 5, data.length); i++) {
      const row = data[i];
      if (!row) continue;

      // 첫 번째 셀이 숫자이면 데이터 시작
      if (typeof row[0] === 'number') {
        return i;
      }
    }
    // 기본값: 헤더 + 2 (서브헤더 스킵)
    return headerRowIndex + 2;
  }

  /**
   * 성남사랑상품권 날짜 형식 파싱 ("2025-10-30 16:09:03" -> "2025-10-30")
   */
  private parseSeongnamDate(dateStr: string): string | null {
    // "YYYY-MM-DD HH:MM:SS" 형식에서 날짜 부분만 추출
    const match = dateStr.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) {
      return match[1];
    }
    return null;
  }
}
