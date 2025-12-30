/**
 * 기존할부 인식 테스트 스크립트
 * 현대카드 샘플 파일에서 기존할부가 제대로 인식되는지 확인
 */

import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

// 샘플 파일 경로
const SAMPLE_DIR = path.join(__dirname, '../sample-data');

/** 현대카드 컬럼 인덱스 */
const COLUMNS = {
  DATE: 0,
  CARD: 1,
  MERCHANT: 2,
  AMOUNT: 3,
  INSTALLMENT: 4,
  DISCOUNT_RATE: 5,
  DISCOUNT_AMOUNT: 6,
  PAYMENT_AMOUNT: 7,
  BALANCE: 8,
  INTEREST: 9,
} as const;

type ExcelRow = (string | number | null | undefined)[];

function parseAmount(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return Math.round(value);
  const str = String(value).trim();
  if (!str) return 0;
  const isNegative = str.startsWith('-') || str.startsWith('△') || str.startsWith('▲');
  const numStr = str.replace(/[^\d]/g, '');
  if (!numStr) return 0;
  const amount = parseInt(numStr, 10);
  return isNegative ? -amount : amount;
}

function analyzeHyundaiFile(filePath: string) {
  console.log('\n' + '='.repeat(80));
  console.log(`분석 파일: ${path.basename(filePath)}`);
  console.log('='.repeat(80));

  const buffer = fs.readFileSync(filePath);
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json<ExcelRow>(sheet, { header: 1 });

  // 1. 헤더 행 찾기
  let headerRowIndex = -1;
  for (let i = 0; i < Math.min(10, data.length); i++) {
    const row = data[i];
    if (!row) continue;
    const rowStr = row.map((c) => String(c || '')).join(' ');
    if (rowStr.includes('결제원금') && rowStr.includes('이용일')) {
      headerRowIndex = i;
      break;
    }
  }
  console.log(`\n[1] 헤더 행 인덱스: ${headerRowIndex}`);

  // 2. 기존할부 섹션 범위 찾기
  let overseasSubtotalRow = -1;
  let installmentSubtotalRow = -1;

  for (let i = headerRowIndex + 1; i < data.length; i++) {
    const row = data[i];
    if (!row) continue;
    const rowStr = row.map((c) => String(c || '')).join(' ');

    if (rowStr.includes('해외이용소계') || rowStr.includes('해외이용 소계')) {
      overseasSubtotalRow = i;
      console.log(`[2] "해외이용소계" 행 발견: ${i} - "${rowStr.substring(0, 50)}..."`);
    }

    if (rowStr.includes('할부소계') || rowStr.includes('할부 소계')) {
      installmentSubtotalRow = i;
      console.log(`[3] "할부소계" 행 발견: ${i} - "${rowStr.substring(0, 50)}..."`);
      break;
    }
  }

  console.log(`\n[4] 기존할부 섹션 범위: ${overseasSubtotalRow + 1} ~ ${installmentSubtotalRow - 1}`);

  // 3. 기존할부 섹션 내 모든 행 분석
  if (overseasSubtotalRow !== -1 && installmentSubtotalRow !== -1) {
    console.log('\n[5] 기존할부 섹션 상세 분석:');
    console.log('-'.repeat(80));

    let installmentCount = 0;
    let installmentTotal = 0;

    for (let i = overseasSubtotalRow + 1; i < installmentSubtotalRow; i++) {
      const row = data[i] as ExcelRow;
      if (!row || row.length === 0) continue;

      const dateCell = String(row[COLUMNS.DATE] || '').trim();
      const merchantCell = String(row[COLUMNS.MERCHANT] || '').trim();
      const installmentCell = String(row[COLUMNS.INSTALLMENT] || '').trim();
      const amountIdx6 = parseAmount(row[COLUMNS.DISCOUNT_AMOUNT]);
      const amountIdx7 = parseAmount(row[COLUMNS.PAYMENT_AMOUNT]);

      // 소계/합계 행 스킵
      if (merchantCell.includes('소계') || merchantCell.includes('합계')) {
        console.log(`  [SKIP] 행${i}: "${merchantCell}" (소계/합계)`);
        continue;
      }

      // 할부/회차 형식 확인 (예: "9/6", "12/3")
      const hasInstallmentFormat = /\d+\/\d+/.test(installmentCell);
      const amount = amountIdx6 !== 0 ? amountIdx6 : amountIdx7;

      if (hasInstallmentFormat && amount > 0) {
        installmentCount++;
        installmentTotal += amount;
        console.log(`  [OK] 행${i}: ${merchantCell.substring(0, 20).padEnd(20)} | 할부: ${installmentCell.padEnd(6)} | 금액: ${amount.toLocaleString()}원`);
      } else if (merchantCell) {
        console.log(`  [??] 행${i}: ${merchantCell.substring(0, 20).padEnd(20)} | 할부: ${installmentCell.padEnd(6)} | 금액: ${amount.toLocaleString()}원 | 형식: ${hasInstallmentFormat}`);
      }
    }

    console.log('-'.repeat(80));
    console.log(`[결과] 기존할부 ${installmentCount}건, 총 ${installmentTotal.toLocaleString()}원`);
  } else {
    console.log('\n[오류] 기존할부 섹션을 찾을 수 없습니다.');

    // 전체 데이터에서 할부/회차 형식 검색
    console.log('\n[대안] 전체 데이터에서 할부/회차 패턴 검색:');
    for (let i = headerRowIndex + 1; i < Math.min(data.length, headerRowIndex + 100); i++) {
      const row = data[i] as ExcelRow;
      if (!row) continue;
      const installmentCell = String(row[COLUMNS.INSTALLMENT] || '').trim();
      const merchantCell = String(row[COLUMNS.MERCHANT] || '').trim();
      if (/\d+\/\d+/.test(installmentCell)) {
        console.log(`  행${i}: ${merchantCell.substring(0, 25).padEnd(25)} | 할부: ${installmentCell}`);
      }
    }
  }
}

// 모든 현대카드 샘플 파일 분석
const files = fs.readdirSync(SAMPLE_DIR).filter(f => f.includes('hyundai'));
for (const file of files) {
  analyzeHyundaiFile(path.join(SAMPLE_DIR, file));
}
