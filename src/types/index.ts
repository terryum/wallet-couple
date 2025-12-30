/**
 * 글로벌 타입 정의
 * Wallet Card Dashboard의 핵심 데이터 타입들을 정의합니다.
 */

/** 카테고리 Set A: AI 자동 분류 대상 */
export const CATEGORY_SET_A = [
  '식료품',
  '외식/커피',
  '쇼핑',
  '관리비',
  '통신/교통',
  '육아',
  '병원/미용',
  '기존할부',
  '이자',
  '양육비',
] as const;

/** 카테고리 Set B: 사용자 수동 변경 전용 */
export const CATEGORY_SET_B = [
  '여행',
  '부모님',
  '친구/동료',
  '경조사/선물',
  '가전/가구',
  '기타',
] as const;

/** 모든 카테고리 */
export const ALL_CATEGORIES = [...CATEGORY_SET_A, ...CATEGORY_SET_B] as const;

export type CategoryA = (typeof CATEGORY_SET_A)[number];
export type CategoryB = (typeof CATEGORY_SET_B)[number];
export type Category = (typeof ALL_CATEGORIES)[number];

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
