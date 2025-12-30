/**
 * Parser Factory - 카드사별 파서 선택 및 실행
 * Strategy Pattern을 사용하여 다양한 카드사 명세서를 처리
 * 비밀번호 보호 파일 지원 (officecrypto-tool + xlsx-populate)
 */

import * as XLSX from 'xlsx';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const XlsxPopulate = require('xlsx-populate');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const officeCrypto = require('officecrypto-tool');
import type { ParseResult, SourceType } from '@/types';
import type { Parser, ParseOptions, ExcelRow } from './types';
import { ParseError } from './types';
import { HyundaiParser } from './hyundai';
import { SamsungParser } from './samsung';
import { LotteParser } from './lotte';
import { KBParser } from './kb';
import { ManualEntryParser } from './manual';
import { OnnuriParser } from './onnuri';
import { SeongnamParser } from './seongnam';

/** 등록된 파서 목록 (우선순위 순) */
const parsers: Parser[] = [
  new ManualEntryParser(), // 직접입력 파일 우선 처리
  new HyundaiParser(),
  new SamsungParser(),
  new LotteParser(),
  new KBParser(),
  new OnnuriParser(),
  new SeongnamParser(),
];

/**
 * 파일 버퍼에서 엑셀 데이터를 읽어옴
 */
export function readExcelFile(
  buffer: ArrayBuffer,
  sheetIndex = 0
): ExcelRow[] {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[sheetIndex];

  if (!sheetName) {
    throw new ParseError(
      `Sheet index ${sheetIndex} not found`,
      'INVALID_DATA'
    );
  }

  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json<ExcelRow>(sheet, {
    header: 1,
    defval: '',
  });

  return data;
}

/**
 * 파일명과 헤더를 분석하여 적절한 파서 선택
 * 모든 시트에서 헤더를 추출하여 확인
 */
export function selectParser(
  fileName: string,
  allData: ExcelRow[][]
): Parser | null {
  // 모든 시트에서 첫 10행의 헤더 정보 추출
  const headers: string[] = [];
  for (const sheetData of allData) {
    for (let i = 0; i < Math.min(10, sheetData.length); i++) {
      const row = sheetData[i];
      if (Array.isArray(row)) {
        row.forEach((cell) => {
          if (cell && typeof cell === 'string') {
            headers.push(cell);
          }
        });
      }
    }
  }

  // 각 파서에게 파싱 가능 여부 확인
  for (const parser of parsers) {
    if (parser.canParse(fileName, headers)) {
      return parser;
    }
  }

  return null;
}

/**
 * officecrypto-tool로 암호화 여부 확인
 */
function isEncryptedFile(buffer: Buffer): boolean {
  try {
    return officeCrypto.isEncrypted(buffer);
  } catch {
    return false;
  }
}

/**
 * 비밀번호 보호 파일 여부 확인 (에러 메시지 기반)
 */
function isPasswordProtected(error: unknown): boolean {
  const errorMsg = String(error);
  return (
    errorMsg.includes('password-protected') ||
    errorMsg.includes("Can't find end of central directory")
  );
}

/**
 * officecrypto-tool로 암호화된 파일 복호화
 */
async function decryptWithOfficeCrypto(
  buffer: Buffer,
  password: string
): Promise<Buffer> {
  try {
    const decrypted = await officeCrypto.decrypt(buffer, { password });
    return decrypted;
  } catch (error) {
    const errorMsg = String(error);
    if (errorMsg.includes('password') || errorMsg.includes('incorrect')) {
      throw new ParseError('비밀번호가 올바르지 않습니다.', 'WRONG_PASSWORD');
    }
    throw error;
  }
}

/**
 * xlsx-populate로 비밀번호 보호 파일 읽기 (ZIP 기반 암호화)
 */
async function readPasswordProtectedFile(
  buffer: ArrayBuffer,
  password: string
): Promise<ExcelRow[][]> {
  try {
    const workbook = await XlsxPopulate.fromDataAsync(Buffer.from(buffer), { password });
    const sheets = workbook.sheets();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allData: ExcelRow[][] = sheets.map((sheet: any) => {
      const usedRange = sheet.usedRange();
      if (!usedRange) return [];

      const startRow = usedRange.startCell().rowNumber();
      const endRow = usedRange.endCell().rowNumber();
      const startCol = usedRange.startCell().columnNumber();
      const endCol = usedRange.endCell().columnNumber();

      const data: ExcelRow[] = [];
      for (let r = startRow; r <= endRow; r++) {
        const row: ExcelRow = [];
        for (let c = startCol; c <= endCol; c++) {
          const cell = sheet.cell(r, c);
          const value = cell.value();
          row.push(value !== undefined ? value : '');
        }
        data.push(row);
      }
      return data;
    });

    return allData;
  } catch (error) {
    const errorMsg = String(error);
    if (errorMsg.includes('password') || errorMsg.includes('decrypt')) {
      throw new ParseError('비밀번호가 올바르지 않습니다.', 'WRONG_PASSWORD');
    }
    throw error;
  }
}

/**
 * 파일을 파싱하여 표준 형식으로 변환
 */
export async function parseFile(
  buffer: ArrayBuffer,
  options: ParseOptions
): Promise<ParseResult> {
  const { fileName, password } = options;
  const nodeBuffer = Buffer.from(buffer);

  try {
    let allData: ExcelRow[][];

    // 1. officecrypto-tool로 암호화 여부 먼저 확인
    const encrypted = isEncryptedFile(nodeBuffer);

    if (encrypted) {
      // 암호화된 파일
      if (!password) {
        throw new ParseError(
          '비밀번호가 필요합니다.',
          'PASSWORD_REQUIRED',
          { fileName }
        );
      }

      // officecrypto-tool로 복호화
      const decrypted = await decryptWithOfficeCrypto(nodeBuffer, password);

      // 복호화된 파일을 XLSX로 읽기
      const workbook = XLSX.read(decrypted, { type: 'buffer' });
      allData = workbook.SheetNames.map((name) => {
        const sheet = workbook.Sheets[name];
        return XLSX.utils.sheet_to_json<ExcelRow>(sheet, {
          header: 1,
          defval: '',
        });
      });
    } else {
      // 2. 암호화되지 않은 파일 - 일반 XLSX로 시도
      try {
        const workbook = XLSX.read(buffer, { type: 'array' });
        allData = workbook.SheetNames.map((name) => {
          const sheet = workbook.Sheets[name];
          return XLSX.utils.sheet_to_json<ExcelRow>(sheet, {
            header: 1,
            defval: '',
          });
        });
      } catch (xlsxError) {
        // 비밀번호 보호 파일인 경우 (ZIP 기반 암호화)
        if (isPasswordProtected(xlsxError)) {
          if (!password) {
            throw new ParseError(
              '비밀번호가 필요합니다.',
              'PASSWORD_REQUIRED',
              { fileName }
            );
          }
          // xlsx-populate로 파일 열기 시도
          allData = await readPasswordProtectedFile(buffer, password);
        } else {
          throw xlsxError;
        }
      }
    }

    // 파서 선택 (모든 시트 데이터 전달)
    const parser = selectParser(fileName, allData);

    if (!parser) {
      return {
        success: false,
        data: [],
        source_type: '기타',
        total_amount: 0,
        error: '지원하지 않는 파일 형식입니다.',
      };
    }

    // 파싱 실행 (일부 파서는 여러 시트 필요)
    const result = parser.parse(allData, fileName);

    return result;
  } catch (error) {
    if (error instanceof ParseError) {
      return {
        success: false,
        data: [],
        source_type: '기타',
        total_amount: 0,
        error: error.message,
        error_code: error.code,
      };
    }

    return {
      success: false,
      data: [],
      source_type: '기타',
      total_amount: 0,
      error: `파일 파싱 중 오류 발생: ${String(error)}`,
    };
  }
}

/**
 * 지원하는 카드사 목록 조회
 */
export function getSupportedSources(): SourceType[] {
  return parsers.map((p) => p.sourceType);
}

export { HyundaiParser, SamsungParser, LotteParser, KBParser, ManualEntryParser, OnnuriParser, SeongnamParser };
