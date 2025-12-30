/**
 * 데이터 로더(파서) 관련 타입 정의
 */

import type { ParsedTransaction, ParseResult, SourceType } from '@/types';

/** 파서 인터페이스 - Strategy Pattern */
export interface Parser {
  /** 파서가 해당 파일을 처리할 수 있는지 확인 */
  canParse(fileName: string, headers: string[]): boolean;

  /** 파일 데이터를 파싱하여 표준 형식으로 변환 */
  parse(data: unknown[][], fileName: string): ParseResult;

  /** 파서의 소스 타입 */
  sourceType: SourceType;
}

/** 엑셀 파일의 행 데이터 (문자열 배열) */
export type ExcelRow = (string | number | null | undefined)[];

/** 파싱 옵션 */
export interface ParseOptions {
  /** 파일명 (파서 선택에 사용) */
  fileName: string;
  /** 소유자 (husband/wife) */
  owner: 'husband' | 'wife';
  /** 시트 인덱스 (기본값: 0) */
  sheetIndex?: number;
  /** 비밀번호 (암호화된 파일용) */
  password?: string;
}

/** 파싱 에러 */
export class ParseError extends Error {
  constructor(
    message: string,
    public readonly code: ParseErrorCode,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ParseError';
  }
}

export type ParseErrorCode =
  | 'UNSUPPORTED_FORMAT'
  | 'VALIDATION_FAILED'
  | 'MISSING_REQUIRED_COLUMN'
  | 'INVALID_DATA'
  | 'TOTAL_MISMATCH'
  | 'PASSWORD_REQUIRED'
  | 'WRONG_PASSWORD';

/** 검증 결과 */
export interface ValidationResult {
  isValid: boolean;
  calculatedTotal: number;
  expectedTotal: number;
  message?: string;
}

/** 컬럼 매핑 정보 */
export interface ColumnMapping {
  dateColumn: number;
  merchantColumn: number;
  amountColumn: number;
  installmentColumn?: number;
}
