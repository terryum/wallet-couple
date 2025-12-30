/**
 * KB국민카드 명세서 파서
 *
 * 식별 키워드: "이용하신 가맹점", "회차"
 * 날짜 형식: "25.08.13" (YY.MM.DD)
 * 헤더가 2행에 걸쳐 있음
 */

import type { ParsedTransaction, ParseResult, Category } from '@/types';
import type { Parser, ExcelRow } from './types';
import { parseAmount } from '@/lib/utils/validation';

/** KB국민카드 컬럼 인덱스 */
const COLUMNS = {
  DATE: 0, // 이용일자
  CARD: 1, // 이용카드
  TYPE: 2, // 구분 (일시불/할부)
  MERCHANT: 3, // 이용하신 가맹점
  // 4: 빈 컬럼
  USED_AMOUNT: 5, // 이용금액
  INSTALLMENT_MONTHS: 6, // 할부개월
  ROUND: 7, // 회차
  PRINCIPAL: 8, // 원금 (첫 번째)
  INTEREST: 9, // 수수료(이자)
} as const;

export class KBParser implements Parser {
  sourceType = 'KB국민카드' as const;

  /**
   * KB국민카드 파일인지 확인
   */
  canParse(fileName: string, headers: string[]): boolean {
    // 파일명으로 확인
    const fileNameLower = fileName.toLowerCase();
    if (fileNameLower.includes('kb') || fileNameLower.includes('국민')) {
      return true;
    }

    // 헤더로 확인
    const hasMerchant = headers.some((h) => h.includes('이용하신 가맹점'));
    const hasRound = headers.some((h) => h === '회차');

    return hasMerchant && hasRound;
  }

  /**
   * KB국민카드 명세서 파싱
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

    // 청구 총액 추출 (마지막 "합계" 행)
    const billingTotal = this.extractBillingTotal(data);

    const transactions: ParsedTransaction[] = [];

    // 헤더는 보통 0~1행에 있음, 데이터는 2행부터 시작
    const startRow = 2;
    let currentDate: string | null = null;

    // 데이터 행 파싱
    for (let i = startRow; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0) continue;

      // 날짜 추출
      const dateCell = String(row[COLUMNS.DATE] || '').trim();
      if (dateCell) {
        const parsedDate = this.parseKBDate(dateCell);
        if (parsedDate) {
          currentDate = parsedDate;
        }
      }

      if (!currentDate) continue;

      // 가맹점명 추출
      const merchantCell = String(row[COLUMNS.MERCHANT] || '').trim();
      if (!merchantCell) continue;

      // 할인/혜택 관련 행 스킵
      if (this.isDiscountRow(merchantCell)) continue;

      // 원금 추출
      const principalCell = row[COLUMNS.PRINCIPAL];
      const amount = parseAmount(principalCell);

      // 금액이 0 이하면 스킵
      if (amount <= 0) continue;

      // 할부 여부 확인
      const typeCell = String(row[COLUMNS.TYPE] || '').trim();
      const installmentMonths = String(
        row[COLUMNS.INSTALLMENT_MONTHS] || ''
      ).trim();
      const isInstallment =
        typeCell === '할부' ||
        (installmentMonths !== '' && /^\d+$/.test(installmentMonths));

      // 카테고리 결정
      const category: Category = isInstallment ? '기존할부' : '기타';

      transactions.push({
        date: currentDate,
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
      billing_total: billingTotal, // 이용대금명세서상의 청구 총액
    };
  }

  /**
   * 청구 총액 추출 (마지막 "합계" 행)
   * KB카드는 "합 계 23 건" 형식으로 공백이 포함됨
   */
  private extractBillingTotal(data: ExcelRow[]): number | undefined {
    // 뒤에서부터 "합계" 행 찾기
    for (let i = data.length - 1; i >= 0; i--) {
      const row = data[i];
      if (!row) continue;

      const firstCell = String(row[0] || '').trim();
      // "합 계" 또는 "합계" 패턴 (공백 제거 후 비교)
      const normalized = firstCell.replace(/\s+/g, '');
      if (normalized.startsWith('합계') && !normalized.includes('소계')) {
        // 인덱스 8 (원금 컬럼)에서 금액 추출
        const amount = parseAmount(row[8]);
        if (amount > 0) {
          return amount;
        }

        // 인덱스 8이 없으면 행에서 가장 큰 숫자 찾기
        let maxAmount = 0;
        for (const cell of row) {
          const cellAmount = parseAmount(cell);
          if (cellAmount > maxAmount) {
            maxAmount = cellAmount;
          }
        }
        if (maxAmount > 0) {
          return maxAmount;
        }
      }
    }

    return undefined;
  }

  /**
   * KB국민카드 날짜 형식 파싱 ("25.08.13" -> "2025-08-13")
   */
  private parseKBDate(dateStr: string): string | null {
    // YY.MM.DD 형식
    const match = dateStr.match(/^(\d{2})\.(\d{2})\.(\d{2})$/);
    if (match) {
      const [, yy, month, day] = match;
      const year = `20${yy}`;
      return `${year}-${month}-${day}`;
    }
    return null;
  }

  /**
   * 할인/혜택 또는 합계 행인지 확인
   */
  private isDiscountRow(merchant: string): boolean {
    const skipKeywords = [
      'My WE:SH',
      '무이자혜택',
      '할인',
      '혜택',
      '포인트',
      '소계',
      '합계',
    ];
    return skipKeywords.some((keyword) =>
      merchant.toLowerCase().includes(keyword.toLowerCase())
    );
  }
}
