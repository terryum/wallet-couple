/**
 * 롯데카드 명세서 파서
 *
 * 식별 키워드: "이용가맹점", "원금", "수수료"
 * 날짜 형식: Excel Serial Number (44732.000601851854)
 * 시트 구조: Sheet1 (요약), Sheet2 (상세)
 */

import type { ParsedTransaction, ParseResult, Category } from '@/types';
import type { Parser, ExcelRow } from './types';
import { parseAmount } from '@/lib/utils/validation';

/** 롯데카드 컬럼 인덱스 */
const COLUMNS = {
  DATE: 0, // 이용일
  CARD: 1, // 이용카드
  MERCHANT: 2, // 이용가맹점
  TOTAL_AMOUNT: 3, // 이용총액
  ROUND: 4, // 회차
  INSTALLMENT: 5, // 할부
  PRINCIPAL: 6, // 원금 (이번 달 입금하실 금액)
  INTEREST: 7, // 수수료
} as const;

export class LotteParser implements Parser {
  sourceType = '롯데카드' as const;

  /**
   * 롯데카드 파일인지 확인
   */
  canParse(fileName: string, headers: string[]): boolean {
    // 파일명으로 확인
    const fileNameLower = fileName.toLowerCase();
    if (
      fileNameLower.includes('롯데') ||
      fileNameLower.includes('lotte') ||
      fileNameLower.includes('이용대금명세서')
    ) {
      return true;
    }

    // 헤더로 확인
    const hasMerchant = headers.some((h) => h === '이용가맹점');
    const hasAmount = headers.some(
      (h) => h === '이번 달 입금하실 금액' || h.includes('입금하실')
    );

    return hasMerchant && hasAmount;
  }

  /**
   * 롯데카드 명세서 파싱
   */
  parse(allSheetData: unknown[][], fileName: string): ParseResult {
    // Sheet1 (요약)에서 청구 총액 추출
    const summaryData = allSheetData[0] as ExcelRow[];
    const billingTotal = this.extractBillingTotal(summaryData);

    // Sheet2 (상세 내역) 사용
    const data = (allSheetData[1] || allSheetData[0]) as ExcelRow[];

    if (!data || data.length === 0) {
      return {
        success: false,
        data: [],
        source_type: this.sourceType,
        total_amount: 0,
        error: '데이터가 비어있습니다.',
      };
    }

    const transactions: ParsedTransaction[] = [];

    // 헤더 행 찾기
    const headerRowIndex = this.findHeaderRow(data);
    const startRow = headerRowIndex === -1 ? 2 : headerRowIndex + 1;

    // 데이터 행 파싱
    for (let i = startRow; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0) continue;

      // 날짜 추출
      const dateCell = row[COLUMNS.DATE];
      if (!dateCell) continue;

      const parsedDate = this.parseLotteDate(dateCell);
      if (!parsedDate) continue;

      // 가맹점명 추출
      const merchantCell = String(row[COLUMNS.MERCHANT] || '').trim();
      if (!merchantCell) continue;

      // 합계/소계 행 스킵
      if (merchantCell.includes('합계') || merchantCell.includes('소계')) continue;

      // 할부 여부 확인
      const installmentCell = String(row[COLUMNS.INSTALLMENT] || '').trim();
      const isInstallment =
        installmentCell !== '' && /^\d+$/.test(installmentCell);

      // 금액 추출: 할부인 경우 원금 + 수수료, 일시불인 경우 원금만
      const principalCell = row[COLUMNS.PRINCIPAL];
      const principal = parseAmount(principalCell);

      let amount = principal;
      if (isInstallment) {
        const interestCell = row[COLUMNS.INTEREST];
        const interest = parseAmount(interestCell);
        amount = principal + interest;
      }

      // 금액이 0 이하면 스킵
      if (amount <= 0) continue;

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

    const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);

    return {
      success: true,
      data: transactions,
      source_type: this.sourceType,
      total_amount: totalAmount,
      // Sheet1에 합계가 없으면 거래 내역 합산값 사용
      billing_total: billingTotal ?? totalAmount,
    };
  }

  /**
   * 요약 시트에서 청구 총액 추출
   * Sheet1에 합계가 없는 경우가 많아서, Sheet2에서 직접 합산
   */
  private extractBillingTotal(summaryData: ExcelRow[]): number | undefined {
    if (!summaryData || summaryData.length === 0) return undefined;

    // 먼저 요약 시트에서 합계 행 찾기
    for (let i = 0; i < summaryData.length; i++) {
      const row = summaryData[i];
      if (!row) continue;

      const rowStr = row.map((c) => String(c || '')).join(' ');

      // "합계" 행 찾기 (소계는 제외)
      if (rowStr.includes('합계') && !rowStr.includes('소계')) {
        // 행에서 가장 큰 숫자를 찾음 (이번 달 입금하실 금액)
        let maxAmount = 0;
        for (const cell of row) {
          const amount = parseAmount(cell);
          if (amount > maxAmount) {
            maxAmount = amount;
          }
        }
        if (maxAmount > 0) {
          return maxAmount;
        }
      }
    }

    // 요약 시트에 합계가 없으면 undefined 반환
    // (parse 함수에서 totalAmount를 billing_total로 사용)
    return undefined;
  }

  /**
   * 헤더 행 찾기
   */
  private findHeaderRow(data: ExcelRow[]): number {
    for (let i = 0; i < Math.min(5, data.length); i++) {
      const row = data[i];
      if (!row) continue;

      const rowStr = row.map((c) => String(c || '')).join(' ');
      if (rowStr.includes('이용일') && rowStr.includes('이용가맹점')) {
        return i;
      }
    }
    return -1;
  }

  /**
   * 롯데카드 날짜 형식 파싱 (Excel Serial Number -> YYYY-MM-DD)
   */
  private parseLotteDate(dateValue: unknown): string | null {
    // Excel Serial Number 처리
    if (typeof dateValue === 'number') {
      // Excel은 1900-01-01을 1로 시작 (윤년 버그로 인해 실제로는 1899-12-30 기준)
      const excelEpoch = new Date(1899, 11, 30);
      const date = new Date(
        excelEpoch.getTime() + dateValue * 24 * 60 * 60 * 1000
      );

      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');

      return `${year}-${month}-${day}`;
    }

    // 문자열 처리
    if (typeof dateValue === 'string') {
      // 숫자 문자열인 경우 (Excel Serial)
      const numValue = parseFloat(dateValue);
      if (!isNaN(numValue) && numValue > 40000) {
        return this.parseLotteDate(numValue);
      }
    }

    return null;
  }
}
