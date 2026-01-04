/**
 * 날짜/월 계산 유틸리티
 * 중복된 월 계산 로직 중앙화
 */

/**
 * 현재 년월 가져오기 (YYYY-MM 형식)
 */
export function getCurrentYearMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * 지난 달 년월 가져오기 (YYYY-MM 형식)
 * 초기값으로 사용
 */
export function getLastMonth(): string {
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const year = lastMonth.getFullYear();
  const month = String(lastMonth.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * 인접 월 계산 (이전/다음 월)
 * @param yearMonth - 기준 월 (YYYY-MM)
 * @param delta - 이동할 월 수 (음수: 이전, 양수: 다음)
 * @returns 계산된 월 (YYYY-MM)
 */
export function getAdjacentMonth(yearMonth: string, delta: number): string {
  const [year, month] = yearMonth.split('-').map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * 이전 월 가져오기 (shorthand)
 */
export function getPrevMonth(yearMonth: string): string {
  return getAdjacentMonth(yearMonth, -1);
}

/**
 * 다음 월 가져오기 (shorthand)
 */
export function getNextMonth(yearMonth: string): string {
  return getAdjacentMonth(yearMonth, 1);
}

/**
 * 최근 N개월 목록 가져오기
 * @param count - 가져올 월 수
 * @param endMonth - 끝 월 (기본: 현재 월)
 * @returns 월 목록 (오래된 순서)
 */
export function getRecentMonths(count: number, endMonth?: string): string[] {
  const end = endMonth || getCurrentYearMonth();
  const months: string[] = [];

  for (let i = count - 1; i >= 0; i--) {
    months.push(getAdjacentMonth(end, -i));
  }

  return months;
}

/**
 * 월 범위 생성
 * @param startMonth - 시작 월 (YYYY-MM)
 * @param endMonth - 끝 월 (YYYY-MM)
 * @returns 월 목록 (시작 ~ 끝, 포함)
 */
export function getMonthRange(startMonth: string, endMonth: string): string[] {
  const months: string[] = [];
  let current = startMonth;

  while (current <= endMonth) {
    months.push(current);
    current = getAdjacentMonth(current, 1);
  }

  return months;
}

/**
 * 월 라벨 포맷 (1월, 2월, ...)
 * @param yearMonth - 년월 (YYYY-MM)
 * @returns 월 라벨 (예: "1월")
 */
export function formatMonthLabel(yearMonth: string): string {
  const month = parseInt(yearMonth.slice(5));
  return `${month}월`;
}

/**
 * 년월 라벨 포맷 (2024년 1월)
 * @param yearMonth - 년월 (YYYY-MM)
 * @returns 년월 라벨 (예: "2024년 1월")
 */
export function formatYearMonthLabel(yearMonth: string): string {
  const [year, month] = yearMonth.split('-');
  return `${year}년 ${parseInt(month)}월`;
}

/**
 * 두 월 사이의 차이 계산 (개월 수)
 * @param month1 - 첫 번째 월 (YYYY-MM)
 * @param month2 - 두 번째 월 (YYYY-MM)
 * @returns 개월 차이 (month2 - month1)
 */
export function getMonthDiff(month1: string, month2: string): number {
  const [y1, m1] = month1.split('-').map(Number);
  const [y2, m2] = month2.split('-').map(Number);
  return (y2 - y1) * 12 + (m2 - m1);
}

/**
 * 유효한 년월 형식인지 검증
 * @param yearMonth - 검증할 문자열
 * @returns 유효한 YYYY-MM 형식인지 여부
 */
export function isValidYearMonth(yearMonth: string): boolean {
  if (!/^\d{4}-\d{2}$/.test(yearMonth)) return false;

  const [year, month] = yearMonth.split('-').map(Number);
  return year >= 1900 && year <= 2100 && month >= 1 && month <= 12;
}
