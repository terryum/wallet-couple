/**
 * 포맷팅 유틸리티 함수
 */

/**
 * 숫자를 천 단위 콤마가 포함된 문자열로 변환
 * @param num - 변환할 숫자
 * @returns 포맷된 문자열 (예: 1,234,567)
 */
export function formatNumber(num: number): string {
  return num.toLocaleString('ko-KR');
}

/**
 * 금액을 원화 표시 형식으로 변환
 * @param amount - 금액
 * @returns 포맷된 문자열 (예: 1,234,567원)
 */
export function formatCurrency(amount: number): string {
  return `${formatNumber(amount)}원`;
}

/**
 * 금액을 만원 단위로 변환
 * @param amount - 금액 (원 단위)
 * @returns 포맷된 문자열 (예: 123만원, 1,234만원)
 */
export function formatManwon(amount: number): string {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const manwon = Math.round(safeAmount / 10000);
  return `${formatNumber(manwon)}만원`;
}

/**
 * 금액을 만원 단위 숫자로만 변환 (단위 없이)
 * @param amount - 금액 (원 단위)
 * @returns 포맷된 문자열 (예: 123, 1,234)
 */
export function formatManwonNumber(amount: number): string {
  const manwon = Math.round(amount / 10000);
  return formatNumber(manwon);
}

/**
 * Date 객체 또는 문자열을 YYYY-MM-DD 형식으로 변환
 * @param date - Date 객체 또는 날짜 문자열
 * @returns YYYY-MM-DD 형식의 문자열
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 날짜를 MM.DD 형식으로 변환 (테이블 표시용)
 * @param date - YYYY-MM-DD 형식의 날짜 문자열
 * @returns MM.DD 형식의 문자열
 */
export function formatShortDate(date: string): string {
  const parts = date.split('-');
  if (parts.length < 3) return date;
  return `${parts[1]}.${parts[2]}`;
}

/**
 * 날짜를 YYYY년 M월 형식으로 변환
 * @param yearMonth - YYYY-MM 형식의 문자열
 * @returns YYYY년 M월 형식의 문자열
 */
export function formatYearMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split('-');
  return `${year}년 ${parseInt(month, 10)}월`;
}

/**
 * 날짜/시간을 MM.DD HH:MM 형식으로 변환 (업로드 시간 표시용)
 * @param dateTimeStr - ISO 형식의 날짜/시간 문자열
 * @returns MM.DD HH:MM 형식의 문자열
 */
export function formatDateTime(dateTimeStr: string): string {
  const d = new Date(dateTimeStr);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${month}.${day} ${hours}:${minutes}`;
}

/**
 * 다양한 날짜 형식을 YYYY-MM-DD로 정규화
 * @param dateStr - 다양한 형식의 날짜 문자열
 * @returns YYYY-MM-DD 형식 또는 null (파싱 실패 시)
 */
export function normalizeDate(dateStr: string): string | null {
  if (!dateStr) return null;

  // 이미 YYYY-MM-DD 형식인 경우
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }

  // YYYY/MM/DD 또는 YYYY.MM.DD 형식
  const slashOrDot = dateStr.match(/^(\d{4})[./](\d{1,2})[./](\d{1,2})$/);
  if (slashOrDot) {
    const [, year, month, day] = slashOrDot;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // MM/DD/YYYY 형식 (미국식)
  const usFormat = dateStr.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
  if (usFormat) {
    const [, month, day, year] = usFormat;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // YYYYMMDD 형식
  const compact = dateStr.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (compact) {
    const [, year, month, day] = compact;
    return `${year}-${month}-${day}`;
  }

  return null;
}
