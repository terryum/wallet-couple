/**
 * 디자인 시스템 - 중앙화된 색상 정의
 * 토스 스타일 블루 기반 + Material Design 원칙
 */

// ============================================
// 브랜드 컬러 (토스 블루)
// ============================================
export const brand = {
  primary: '#3182F6',      // 메인 브랜드 컬러
  primaryHover: '#1B64DA', // 호버 상태
  primaryPressed: '#0D4FC0', // 눌림 상태
  primaryLight: '#E8F3FF', // 밝은 배경
  primaryLighter: '#F0F7FF', // 더 밝은 배경
} as const;

// ============================================
// 시맨틱 컬러
// ============================================
export const semantic = {
  success: '#00C853',       // 성공, 소득
  successLight: '#E8F9EE',
  error: '#FF5252',         // 오류, 지출 증가
  errorLight: '#FFEBEE',
  warning: '#FFB300',       // 경고
  warningLight: '#FFF8E6',
  info: '#2196F3',          // 정보
  infoLight: '#E3F2FD',
} as const;

// ============================================
// 거래 유형 컬러
// ============================================
export const transaction = {
  expense: '#3182F6',       // 지출 (파란색 - 브랜드 블루)
  expenseLight: '#E8F3FF',
  expenseDark: '#1D4ED8',   // 지출 진한 버전
  income: '#059669',        // 소득 (짙은 초록 - emerald-600)
  incomeLight: '#D1FAE5',
  incomeDark: '#047857',    // 소득 진한 버전 (emerald-700)
  balance: '#FF5252',       // 손익선 (빨간색)
  balancePositive: '#059669', // 양수 손익 (초록)
  balanceNegative: '#3182F6', // 음수 손익 (파랑)
} as const;

// ============================================
// 소유자 컬러
// ============================================
export const owner = {
  husband: '#3B82F6',       // 남편 (블루)
  husbandLight: '#DBEAFE',
  wife: '#EC4899',          // 아내 (핑크)
  wifeLight: '#FCE7F3',
} as const;

// ============================================
// 중립 컬러 (슬레이트 기반)
// ============================================
export const neutral = {
  // 배경
  white: '#FFFFFF',
  bg: '#F8FAFC',            // slate-50
  bgAlt: '#F1F5F9',         // slate-100

  // 텍스트
  textPrimary: '#0F172A',   // slate-900
  textSecondary: '#475569', // slate-600
  textTertiary: '#94A3B8',  // slate-400
  textDisabled: '#CBD5E1',  // slate-300

  // 테두리
  border: '#E2E8F0',        // slate-200
  borderLight: '#F1F5F9',   // slate-100
} as const;

// ============================================
// 차트 컬러 - 지출 카테고리 (17개)
// 블루→퍼플→핑크→오렌지 스펙트럼 (초록 계열 제외 - 소득과 구분)
// ============================================
export const expenseChartColors = {
  // 고정비용 (딥 블루/인디고 계열)
  관리비: '#3B82F6',        // blue-500 (브랜드 블루)
  대출이자: '#2563EB',      // blue-600 (진한 블루)
  기존할부: '#1D4ED8',      // blue-700 (더 진한 블루)
  세금: '#4F46E5',          // indigo-600 (인디고)
  양육비: '#6366F1',        // indigo-500 (밝은 인디고)

  // 생활필수 (스카이블루/퍼플 계열)
  식료품: '#0EA5E9',        // sky-500 (스카이 블루)
  '외식/커피': '#38BDF8',   // sky-400 (밝은 스카이)
  '통신/교통': '#7C3AED',   // violet-600 (바이올렛)

  // 개인/생활 (바이올렛/퍼플 계열)
  쇼핑: '#8B5CF6',          // violet-500 (밝은 바이올렛)
  '병원/미용': '#A855F7',   // purple-500 (퍼플)
  육아: '#C084FC',          // purple-400 (밝은 퍼플)

  // 사교/특별 (핑크/로즈/오렌지 계열)
  여행: '#EC4899',          // pink-500 (핑크)
  부모님: '#F472B6',        // pink-400 (밝은 핑크)
  '친구/동료': '#FB7185',   // rose-400 (로즈)
  '경조사/선물': '#F97316', // orange-500 (오렌지)
  '가전/가구': '#FB923C',   // orange-400 (밝은 오렌지)

  // 기타
  기타: '#94A3B8',          // slate-400
} as const;

// ============================================
// 차트 컬러 - 소득 카테고리 (6개)
// 그린 계열 - 성장과 수익
// ============================================
export const incomeChartColors = {
  급여: '#059669',          // emerald-600 (메인 수입)
  상여: '#10B981',          // emerald-500
  '정부/환급': '#34D399',   // emerald-400
  '강연/도서': '#6EE7B7',   // emerald-300
  금융소득: '#A7F3D0',      // emerald-200
  기타소득: '#D1FAE5',      // emerald-100
} as const;

// ============================================
// 통합 차트 컬러 (23개 + etc.)
// ============================================
export const chartColors: Record<string, string> = {
  ...expenseChartColors,
  ...incomeChartColors,
  'etc.': '#94A3B8',        // 기타와 동일
} as const;

// ============================================
// 배지 컬러 (TransactionRow용)
// Tailwind 클래스 형태
// ============================================
export const badgeColors: Record<string, string> = {
  // 지출 카테고리 - 블루→퍼플→핑크→오렌지 (초록 제외)
  관리비: 'bg-blue-50 text-blue-700',
  대출이자: 'bg-blue-100 text-blue-700',
  기존할부: 'bg-blue-100 text-blue-800',
  세금: 'bg-indigo-50 text-indigo-700',
  양육비: 'bg-indigo-50 text-indigo-600',
  식료품: 'bg-sky-50 text-sky-700',
  '외식/커피': 'bg-sky-50 text-sky-600',
  '통신/교통': 'bg-violet-50 text-violet-700',
  쇼핑: 'bg-violet-50 text-violet-600',
  '병원/미용': 'bg-purple-50 text-purple-700',
  육아: 'bg-purple-50 text-purple-600',
  여행: 'bg-pink-50 text-pink-700',
  부모님: 'bg-pink-50 text-pink-600',
  '친구/동료': 'bg-rose-50 text-rose-600',
  '경조사/선물': 'bg-orange-50 text-orange-700',
  '가전/가구': 'bg-orange-50 text-orange-600',
  기타: 'bg-slate-50 text-slate-500',

  // 소득 카테고리 (그린 계열 - 지출과 명확히 구분)
  급여: 'bg-emerald-100 text-emerald-700',
  상여: 'bg-emerald-50 text-emerald-600',
  '정부/환급': 'bg-emerald-50 text-emerald-500',
  '강연/도서': 'bg-emerald-50 text-emerald-500',
  금융소득: 'bg-emerald-50 text-emerald-500',
  기타소득: 'bg-emerald-50 text-emerald-400',
} as const;

// ============================================
// 헬퍼 함수
// ============================================

/**
 * 카테고리에 해당하는 차트 색상 반환
 */
export function getCategoryColor(category: string): string {
  return chartColors[category] || chartColors['기타'];
}

/**
 * 카테고리에 해당하는 배지 클래스 반환
 */
export function getBadgeColorClass(category: string): string {
  return badgeColors[category] || badgeColors['기타'];
}

/**
 * 거래 유형에 따른 색상 반환
 */
export function getTransactionTypeColor(type: 'expense' | 'income'): string {
  return type === 'income' ? transaction.income : transaction.expense;
}

/**
 * 소유자에 따른 색상 반환
 */
export function getOwnerColor(ownerType: 'husband' | 'wife' | string): string {
  if (ownerType === 'husband') return owner.husband;
  if (ownerType === 'wife') return owner.wife;
  return neutral.textSecondary;
}

// ============================================
// 전체 색상 객체 (하위 호환성)
// ============================================
export const colors = {
  brand,
  semantic,
  transaction,
  owner,
  neutral,
  chart: chartColors,
  badge: badgeColors,
} as const;

export default colors;
