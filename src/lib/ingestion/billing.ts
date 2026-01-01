import type { Owner, ParsedTransaction } from '@/types';
import { OWNER_NAMES, SOURCE_TYPE_NAMES } from './constants';

/**
 * 파일 이름에서 청구월 추출 시도
 */
export function extractBillingMonthFromFilename(filename: string): string | null {
  const patterns = [
    /(\d{4})(\d{2})/, // 202512
    /(\d{4})[-_](\d{2})/, // 2025-12, 2025_12
    /(\d{4})년\s*(\d{1,2})월/, // 2025년 12월
  ];

  for (const pattern of patterns) {
    const match = filename.match(pattern);
    if (match) {
      const year = match[1];
      const month = match[2].padStart(2, '0');
      return `${year}-${month}`;
    }
  }
  return null;
}

/**
 * 거래 내역에서 청구월 추출 (일반 거래의 가장 최근 월)
 * 기존할부는 제외 (오래된 이용일을 가지고 있어서 잘못된 결과 초래)
 */
export function extractBillingMonthFromTransactions(
  transactions: ParsedTransaction[]
): string | null {
  if (transactions.length === 0) return null;

  const normalTransactions = transactions.filter((t) => !t.is_installment);
  const dates = normalTransactions
    .map((t) => t.date)
    .filter((d) => d)
    .sort()
    .reverse();

  if (dates.length === 0) return null;
  return dates[0].substring(0, 7); // YYYY-MM
}

/**
 * 표시용 파일 이름 생성
 * 예: "2025년_12월_남편_현대카드.xls"
 */
export function generateDisplayName(
  originalFilename: string,
  sourceType: string,
  owner: Owner,
  billingMonth: string | null
): string {
  const ext = originalFilename.split('.').pop() || 'xls';
  const sourceName = SOURCE_TYPE_NAMES[sourceType] || sourceType;
  const ownerName = OWNER_NAMES[owner];

  if (billingMonth) {
    const [year, month] = billingMonth.split('-');
    return `${year}년_${parseInt(month)}월_${ownerName}_${sourceName}.${ext}`;
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return `${year}년_${month}월_${ownerName}_${sourceName}.${ext}`;
}

/**
 * 기존할부 거래 날짜를 청구월 기준 25일로 맞춤
 */
export function getInstallmentDate(
  originalDate: string,
  billingMonth: string | null
): string {
  if (billingMonth) {
    return `${billingMonth}-25`;
  }
  return `${originalDate.substring(0, 7)}-25`;
}
