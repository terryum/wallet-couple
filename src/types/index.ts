/**
 * 글로벌 타입 정의
 * Wallet Card Dashboard의 핵심 데이터 타입들을 정의합니다.
 */

/** 지출 카테고리 Set A: AI 자동 분류 대상 */
export const EXPENSE_CATEGORY_SET_A = [
  '식료품',
  '외식/커피',
  '쇼핑',
  '관리비',
  '통신/교통',
  '육아',
  '병원/미용',
  '기존할부',
  '대출이자',
  '양육비',
  '세금',
] as const;

/** 지출 카테고리 Set B: 사용자 수동 변경 전용 */
export const EXPENSE_CATEGORY_SET_B = [
  '여행',
  '부모님',
  '친구/동료',
  '경조사/선물',
  '가전/가구',
  '기타',
] as const;

/** 소득 카테고리 */
export const INCOME_CATEGORIES = [
  '급여',
  '상여',
  '정부/환급',
  '강연/도서',
  '금융소득',
  '기타소득',
] as const;

/** 기존 호환성을 위한 alias */
export const CATEGORY_SET_A = EXPENSE_CATEGORY_SET_A;
export const CATEGORY_SET_B = EXPENSE_CATEGORY_SET_B;

/** 모든 지출 카테고리 */
export const ALL_EXPENSE_CATEGORIES = [...EXPENSE_CATEGORY_SET_A, ...EXPENSE_CATEGORY_SET_B] as const;

/** 모든 카테고리 (지출 + 소득) */
export const ALL_CATEGORIES = [...ALL_EXPENSE_CATEGORIES, ...INCOME_CATEGORIES] as const;

export type CategoryA = (typeof CATEGORY_SET_A)[number];
export type CategoryB = (typeof CATEGORY_SET_B)[number];
export type Category = (typeof ALL_CATEGORIES)[number];
export type IncomeCategory = (typeof INCOME_CATEGORIES)[number];
export type ExpenseCategory = (typeof ALL_EXPENSE_CATEGORIES)[number];

/** 거래 유형 */
export type TransactionType = 'expense' | 'income';

/** 거래 내역 소유자 (부부 구분) */
export type Owner = 'husband' | 'wife';

/** 데이터 소스 타입 */
export type SourceType =
  | '현대카드'
  | '롯데카드'
  | '삼성카드'
  | 'KB국민카드'
  | '토스뱅크'
  | '온누리'
  | '성남사랑'
  | '우리은행'
  | '한국투자증권'
  | '직접입력'
  | '기타';

/** 거래 내역 (DB 스키마와 일치) */
export interface Transaction {
  id: string;
  transaction_date: string; // YYYY-MM-DD
  merchant_name: string;
  amount: number;
  category: Category;
  memo: string | null;
  source_type: SourceType;
  owner: Owner;
  is_deleted: boolean;
  transaction_type: TransactionType; // 거래 유형 (지출/소득)
  raw_data: Record<string, unknown> | null;
  created_at: string;
}

/** 거래 내역 생성 DTO */
export interface CreateTransactionDto {
  transaction_date: string;
  merchant_name: string;
  amount: number;
  category: Category;
  memo?: string;
  source_type: SourceType;
  owner: Owner;
  transaction_type?: TransactionType;
  raw_data?: Record<string, unknown>;
}

/** 거래 내역 수정 DTO */
export interface UpdateTransactionDto {
  transaction_date?: string;
  merchant_name?: string;
  amount?: number;
  category?: Category;
  memo?: string;
  is_deleted?: boolean;
}

/** 파서 출력 스키마 (공통) */
export interface ParsedTransaction {
  date: string; // YYYY-MM-DD
  merchant: string;
  amount: number;
  category: Category;
  is_installment: boolean;
  transaction_type?: TransactionType; // 거래 유형 (기본값: expense)
}

/** 파싱 결과 */
export interface ParseResult {
  success: boolean;
  data: ParsedTransaction[];
  source_type: SourceType;
  total_amount: number;
  billing_total?: number; // 이용대금명세서상의 청구 총액
  error?: string;
  error_code?: 'PASSWORD_REQUIRED' | 'WRONG_PASSWORD' | string;
}

/** API 응답 공통 타입 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/** 월별 필터 파라미터 */
export interface TransactionQueryParams {
  month: string; // YYYY-MM
  sort?: 'date_asc' | 'date_desc' | 'amount_asc' | 'amount_desc';
  category?: Category;
  owner?: Owner;
  /** 거래 유형 필터: 'expense' | 'income' | 'all' (기본: 'expense') */
  transactionType?: TransactionType | 'all';
  /** 페이지네이션: 반환할 최대 건수 */
  limit?: number;
  /** 페이지네이션: 건너뛸 건수 */
  offset?: number;
}

/** 대시보드 집계 데이터 */
export interface MonthlyAggregate {
  month: string;
  total_amount: number;
  by_category: {
    category: Category;
    amount: number;
    percentage: number;
  }[];
}

/** 액션 타입 */
export type ActionType = 'create' | 'update' | 'delete' | 'upload' | 'bulk_update' | 'bulk_delete';

/** 엔티티 타입 */
export type EntityType = 'transaction' | 'file' | 'transactions';

/** 액션 히스토리 */
export interface ActionHistory {
  id: string;
  action_type: ActionType;
  entity_type: EntityType;
  entity_id: string | null;
  description: string;
  previous_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  affected_ids: string[];
  owner: Owner | null;
  created_at: string;
}

/** 액션 히스토리 생성 DTO */
export interface CreateActionHistoryDto {
  action_type: ActionType;
  entity_type: EntityType;
  entity_id?: string;
  description: string;
  previous_data?: Record<string, unknown> | null;
  new_data?: Record<string, unknown> | null;
  affected_ids?: string[];
  owner?: Owner;
}

/** 모든 SourceType 목록 */
export const ALL_SOURCE_TYPES: SourceType[] = [
  '현대카드',
  '롯데카드',
  '삼성카드',
  'KB국민카드',
  '토스뱅크',
  '온누리',
  '성남사랑',
  '우리은행',
  '한국투자증권',
  '직접입력',
  '기타',
];

/** 검색 기간 타입 */
export type PeriodType = 'current_month' | 'all' | 'custom';

/** 검색 필터 옵션 */
export interface SearchFilters {
  /** 기간 옵션 */
  periodType: PeriodType;
  /** 커스텀 기간 (periodType이 'custom'일 때) */
  dateRange?: {
    startDate: string; // YYYY-MM-DD
    endDate: string; // YYYY-MM-DD
  };
  /** 이용처 검색어 */
  merchantSearch?: string;
  /** 카테고리 필터 (복수) */
  categories?: Category[];
  /** 금액 범위 */
  amountRange?: {
    min?: number;
    max?: number;
  };
  /** 결제수단 필터 (복수) */
  sourceTypes?: SourceType[];
}

/** 검색 API 파라미터 */
export interface TransactionSearchParams {
  startDate?: string;
  endDate?: string;
  merchantSearch?: string;
  categories?: string; // 쉼표 구분
  sourceTypes?: string; // 쉼표 구분
  amountMin?: number;
  amountMax?: number;
  owner?: Owner;
  transactionType?: TransactionType | 'all';
  sort?: 'date_asc' | 'date_desc' | 'amount_asc' | 'amount_desc';
  limit?: number;
  offset?: number;
}

/** 검색 결과 */
export interface SearchResult {
  data: Transaction[];
  count: number;
  hasMore: boolean;
}
