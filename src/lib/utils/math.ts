/**
 * 안전한 수학 계산 유틸리티
 * NaN, Infinity 방지를 위한 방어적 계산 함수들
 */

/**
 * 안전한 백분율 계산
 * @param value - 분자 값
 * @param total - 분모 값
 * @param decimals - 소수점 자릿수 (기본: 2)
 * @returns 백분율 값 (total이 0이면 0 반환)
 */
export function safePercentage(
  value: number,
  total: number,
  decimals: number = 2
): number {
  if (total === 0 || !Number.isFinite(total)) return 0;
  if (!Number.isFinite(value)) return 0;

  const percentage = (value / total) * 100;
  return Number.isFinite(percentage)
    ? Number(percentage.toFixed(decimals))
    : 0;
}

/**
 * 안전한 나눗셈
 * @param numerator - 분자
 * @param denominator - 분모
 * @param fallback - 분모가 0일 때 반환값 (기본: 0)
 * @returns 나눗셈 결과 또는 fallback
 */
export function safeDivide(
  numerator: number,
  denominator: number,
  fallback: number = 0
): number {
  if (denominator === 0 || !Number.isFinite(denominator)) return fallback;
  if (!Number.isFinite(numerator)) return fallback;

  const result = numerator / denominator;
  return Number.isFinite(result) ? result : fallback;
}

/**
 * 안전한 Y축 도메인 계산 (차트용)
 * @param values - 값 배열
 * @param padding - 상단 여백 비율 (기본: 1.1 = 10%)
 * @param minRange - 최소 범위 (기본: 100)
 * @returns [최소값, 최대값] 튜플
 */
export function safeYAxisDomain(
  values: number[],
  padding: number = 1.1,
  minRange: number = 100
): [number, number] {
  // 빈 배열이거나 유효한 값이 없는 경우
  const validValues = values.filter(Number.isFinite);
  if (validValues.length === 0) {
    return [0, minRange];
  }

  const maxValue = Math.max(...validValues);
  const minValue = Math.min(...validValues);

  // 모든 값이 0인 경우
  if (maxValue === 0 && minValue === 0) {
    return [0, minRange];
  }

  // 음수 값이 있는 경우
  if (minValue < 0) {
    const absMax = Math.max(Math.abs(minValue), Math.abs(maxValue));
    const paddedMax = absMax * padding;
    return [-paddedMax, paddedMax];
  }

  // 양수만 있는 경우
  const paddedMax = Math.max(maxValue * padding, minRange);
  return [0, paddedMax];
}

/**
 * 안전한 증감률 계산
 * @param current - 현재 값
 * @param previous - 이전 값
 * @returns 증감률 (이전 값이 0이면 null 반환)
 */
export function safePercentChange(
  current: number,
  previous: number
): number | null {
  if (previous === 0 || !Number.isFinite(previous)) return null;
  if (!Number.isFinite(current)) return null;

  const change = ((current - previous) / previous) * 100;
  return Number.isFinite(change) ? change : null;
}

/**
 * 숫자 유효성 검증
 * @param value - 검증할 값
 * @returns 유효한 숫자인지 여부
 */
export function isValidNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * 안전한 숫자 변환
 * @param value - 변환할 값
 * @param fallback - 변환 실패 시 반환값 (기본: 0)
 * @returns 숫자 또는 fallback
 */
export function toSafeNumber(value: unknown, fallback: number = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}
