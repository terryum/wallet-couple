/**
 * 삼성카드 명세서 파서
 *
 * 식별 키워드: "가맹점", "일시불합계"
 * 날짜 형식: "20250912" (YYYYMMDD)
 * 시트 구조: 청구요약, 일시불, 할부, 연회비-기타수수료
 */

import type { ParsedTransaction, ParseResult, Category } from '@/types';
import type { Parser, ExcelRow } from './types';
import { parseAmount } from '@/lib/utils/validation';

/** 삼성카드 컬럼 인덱스 */
const COLUMNS = {
  DATE: 0, // 이용일
  CARD_TYPE: 1, // 이용구분
  MERCHANT: 2, // 가맹점
  USED_AMOUNT: 3, // 이용금액
  TOTAL_INSTALLMENT: 4, // 총할부금액
  BENEFIT_TYPE: 5, // 이용혜택
  BENEFIT_AMOUNT: 6, // 혜택금액
  MONTHS: 7, // 개월
  ROUND: 8, // 회차
  PRINCIPAL: 9, // 원금
  INTEREST: 10, // 이자/수수료
} as const;

export class SamsungParser implements Parser {
  sourceType = '삼성카드' as const;

  /**
   * 삼성카드 파일인지 확인
   */
  canParse(fileName: string, headers: string[]): boolean {
    // 파일명으로 확인
    const fileNameLower = fileName.toLowerCase();
    if (
      fileNameLower.includes('samsung') ||
      fileNameLower.includes('삼성')
    ) {
      return true;
    }

    // 헤더로 확인 - 가맹점과 일시불합계가 있어야 함
    const hasMerchant = headers.some((h) => h === '가맹점');
    const hasSummary = headers.some((h) => h.includes('일시불합계'));

    return hasMerchant && hasSummary;
  }

  /**
   * 삼성카드 명세서 파싱
   */
  parse(allSheetData: unknown[][], fileName: string): ParseResult {
    const transactions: ParsedTransaction[] = [];
    let billingTotal = 0;

    // 여러 시트 순회 (일시불, 할부 시트 처리)
    for (const sheetData of allSheetData) {
      const data = sheetData as ExcelRow[];
      if (!data || data.length === 0) continue;

      // 시트 타입 확인
      const firstCell = String(data[0]?.[0] || '').trim();
      const isInstallmentSheet = firstCell === '할부';
      const isOneTimeSheet = firstCell === '일시불';

      if (!isInstallmentSheet && !isOneTimeSheet) continue;

      // 청구 금액 추출 (일시불합계, 할부합계)
      const sheetBillingTotal = this.extractSheetBillingTotal(data, isInstallmentSheet);
      billingTotal += sheetBillingTotal;

      // 헤더 행 찾기 (이용일이 포함된 행)
      const headerRowIndex = this.findHeaderRow(data);
      if (headerRowIndex === -1) continue;

      // 데이터 행 파싱
      for (let i = headerRowIndex + 1; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length === 0) continue;

        // 합계/소계 행 스킵
        const merchantCell = String(row[COLUMNS.MERCHANT] || '').trim();
        if (merchantCell.includes('합계')) continue;
        if (merchantCell.includes('소계')) continue;
        if (merchantCell.includes('미리입금')) continue;

        // 날짜 추출
        const dateCell = String(row[COLUMNS.DATE] || '').trim();
        if (!dateCell) continue;

        const parsedDate = this.parseSamsungDate(dateCell);
        if (!parsedDate) continue;

        // 가맹점명 추출
        if (!merchantCell) continue;

        // 원금 추출
        const principalCell = row[COLUMNS.PRINCIPAL];
        const amount = parseAmount(principalCell);

        // 금액이 0 이하면 스킵
        if (amount <= 0) continue;

        // 할부 여부 확인
        const roundCell = String(row[COLUMNS.ROUND] || '').trim();
        const isInstallment =
          isInstallmentSheet || /^\d+$/.test(roundCell);

        // 카테고리 결정
        const category: Category = isInstallment ? '기존할부' : '기타';

        transactions.push({
          date: parsedDate,
          merchant: merchantCell,
          amount,
          category,
          is_installment: isInstallment,
        });
      }
    }

    const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);

    return {
      success: true,
      data: transactions,
      source_type: this.sourceType,
      total_amount: totalAmount,
      billing_total: billingTotal > 0 ? billingTotal : undefined,
    };
  }

  /**
   * 시트에서 합계 금액 추출 (일시불합계 또는 할부합계)
   */
  private extractSheetBillingTotal(data: ExcelRow[], isInstallmentSheet: boolean): number {
    const targetKeyword = isInstallmentSheet ? '할부합계' : '일시불합계';

    for (let i = data.length - 1; i >= 0; i--) {
      const row = data[i];
      if (!row) continue;

      const rowStr = row.map((c) => String(c || '')).join(' ');
      if (rowStr.includes(targetKeyword)) {
        // 행에서 가장 큰 숫자를 찾음
        let maxAmount = 0;
        for (const cell of row) {
          const amount = parseAmount(cell);
          if (amount > maxAmount) {
            maxAmount = amount;
          }
        }
        return maxAmount;
      }
    }

    return 0;
  }

  /**
   * 헤더 행 찾기
   */
  private findHeaderRow(data: ExcelRow[]): number {
    for (let i = 0; i < Math.min(10, data.length); i++) {
      const row = data[i];
      if (!row) continue;

      const rowStr = row.map((c) => String(c || '')).join(' ');
      if (rowStr.includes('이용일') && rowStr.includes('가맹점')) {
        return i;
      }
    }
    return -1;
  }

  /**
   * 삼성카드 날짜 형식 파싱 ("20250912" -> "2025-09-12")
   */
  private parseSamsungDate(dateStr: string): string | null {
    // YYYYMMDD 형식
    const match = dateStr.match(/^(\d{4})(\d{2})(\d{2})$/);
    if (match) {
      const [, year, month, day] = match;
      return `${year}-${month}-${day}`;
    }
    return null;
  }
}
