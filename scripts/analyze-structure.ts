/**
 * 현대카드 파일 구조 분석
 * 어떤 키워드가 있는지, 할부/회차 컬럼에 어떤 값이 있는지 확인
 */

import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

const SAMPLE_DIR = path.join(__dirname, '../sample-data');

const COLUMNS = {
  DATE: 0,
  CARD: 1,
  MERCHANT: 2,
  AMOUNT: 3,
  INSTALLMENT: 4,
} as const;

type ExcelRow = (string | number | null | undefined)[];

function analyzeFile(filePath: string) {
  console.log('\n' + '='.repeat(80));
  console.log(`파일: ${path.basename(filePath)}`);
  console.log('='.repeat(80));

  const buffer = fs.readFileSync(filePath);
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json<ExcelRow>(sheet, { header: 1 });

  console.log(`\n총 행 수: ${data.length}`);

  // "소계" 또는 특별한 키워드가 포함된 행 찾기
  console.log('\n[소계/합계 관련 행 찾기]');
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (!row) continue;
    const rowStr = row.map((c) => String(c || '')).join(' ');
    if (rowStr.includes('소계') || rowStr.includes('합계') ||
        rowStr.includes('해외') || rowStr.includes('할부') ||
        rowStr.includes('국내') || rowStr.includes('일시불')) {
      console.log(`행${i}: ${rowStr.substring(0, 100)}`);
    }
  }

  // 할부/회차 컬럼에 값이 있는 행 찾기
  console.log('\n[할부/회차 컬럼(인덱스4)에 값이 있는 행]');
  let count = 0;
  for (let i = 0; i < data.length && count < 30; i++) {
    const row = data[i] as ExcelRow;
    if (!row) continue;
    const installmentCell = String(row[COLUMNS.INSTALLMENT] || '').trim();
    if (installmentCell && installmentCell !== '할부/회차') {
      const merchantCell = String(row[COLUMNS.MERCHANT] || '').trim();
      console.log(`행${i}: ${merchantCell.substring(0, 25).padEnd(25)} | 할부/회차: "${installmentCell}"`);
      count++;
    }
  }

  // 처음 20행 출력 (구조 파악)
  console.log('\n[처음 20행 구조]');
  for (let i = 0; i < Math.min(20, data.length); i++) {
    const row = data[i];
    if (!row) continue;
    const rowStr = row.slice(0, 6).map((c) => String(c || '').substring(0, 15)).join(' | ');
    console.log(`행${i}: ${rowStr}`);
  }
}

const files = fs.readdirSync(SAMPLE_DIR).filter(f => f.includes('hyundai'));
// 첫 번째 파일만 분석
if (files.length > 0) {
  analyzeFile(path.join(SAMPLE_DIR, files[0]));
}
