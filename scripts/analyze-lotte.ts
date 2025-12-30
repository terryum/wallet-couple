/**
 * 롯데카드 파일 분석 - 본죽 거래 확인
 */

import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

const SAMPLE_DIR = path.join(__dirname, '../sample-data');

type ExcelRow = (string | number | null | undefined)[];

function parseLotteDate(dateValue: unknown): string | null {
  if (typeof dateValue === 'number') {
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + dateValue * 24 * 60 * 60 * 1000);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  if (typeof dateValue === 'string') {
    const numValue = parseFloat(dateValue);
    if (!isNaN(numValue) && numValue > 40000) {
      return parseLotteDate(numValue);
    }
  }
  return null;
}

function parseAmount(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return Math.round(value);
  const str = String(value).trim();
  if (!str) return 0;
  const numStr = str.replace(/[^0-9-]/g, '');
  if (!numStr) return 0;
  return parseInt(numStr, 10);
}

function analyzeFile(filePath: string) {
  console.log('\n' + '='.repeat(80));
  console.log(`파일: ${path.basename(filePath)}`);
  console.log('='.repeat(80));

  const buffer = fs.readFileSync(filePath);
  const workbook = XLSX.read(buffer, { type: 'buffer' });

  console.log(`\n시트 목록: ${workbook.SheetNames.join(', ')}`);

  // Sheet2 (상세 내역) 분석
  const sheetName = workbook.SheetNames[1] || workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json<ExcelRow>(sheet, { header: 1 });

  console.log(`\n분석 시트: ${sheetName}`);
  console.log(`총 행 수: ${data.length}`);

  // 본죽 거래 찾기
  console.log('\n[본죽 관련 행 찾기]');
  let bonjukCount = 0;
  const bonjukTransactions: { row: number; date: string | null; merchant: string; amount: number; raw: string }[] = [];

  for (let i = 0; i < data.length; i++) {
    const row = data[i] as ExcelRow;
    if (!row) continue;

    const rowStr = row.map(c => String(c || '')).join(' ');
    if (rowStr.includes('본죽')) {
      bonjukCount++;
      const dateCell = row[0];
      const merchantCell = String(row[2] || '').trim();
      const principalCell = row[6]; // 원금

      const parsedDate = parseLotteDate(dateCell);
      const amount = parseAmount(principalCell);

      bonjukTransactions.push({
        row: i,
        date: parsedDate,
        merchant: merchantCell,
        amount,
        raw: row.slice(0, 8).map(c => String(c || '').substring(0, 15)).join(' | ')
      });

      console.log(`행${i}: ${row.slice(0, 8).map(c => String(c || '').substring(0, 15)).join(' | ')}`);
    }
  }

  console.log(`\n[본죽 거래 파싱 결과]`);
  console.log(`발견된 본죽 행: ${bonjukCount}개`);
  bonjukTransactions.forEach((t, idx) => {
    console.log(`  ${idx + 1}. 날짜: ${t.date}, 가맹점: ${t.merchant}, 금액: ${t.amount}`);
  });

  // 10월 31일 거래 모두 찾기
  console.log('\n[10월 31일 모든 거래]');
  let oct31Count = 0;
  for (let i = 0; i < data.length; i++) {
    const row = data[i] as ExcelRow;
    if (!row) continue;

    const dateCell = row[0];
    const parsedDate = parseLotteDate(dateCell);

    if (parsedDate === '2024-10-31') {
      oct31Count++;
      const merchantCell = String(row[2] || '').trim();
      const principalCell = row[6];
      const amount = parseAmount(principalCell);
      console.log(`행${i}: ${parsedDate} | ${merchantCell} | ${amount}원`);
    }
  }
  console.log(`10월 31일 거래 수: ${oct31Count}개`);

  // 헤더 행 확인
  console.log('\n[처음 5행 구조]');
  for (let i = 0; i < Math.min(5, data.length); i++) {
    const row = data[i];
    if (!row) continue;
    console.log(`행${i}: ${(row as ExcelRow).slice(0, 8).map(c => String(c || '').substring(0, 12)).join(' | ')}`);
  }
}

// 11월 이용대금명세서 파일 분석
const files = fs.readdirSync(SAMPLE_DIR).filter(f => f.includes('이용대금명세서') && f.includes('2511'));
console.log('찾은 파일:', files);
if (files.length > 0) {
  analyzeFile(path.join(SAMPLE_DIR, files[0]));
} else {
  console.log('이용대금명세서 2511 파일을 찾을 수 없습니다.');
  // 모든 이용대금명세서 파일 분석
  const allFiles = fs.readdirSync(SAMPLE_DIR).filter(f => f.includes('이용대금명세서'));
  console.log('모든 이용대금명세서 파일:', allFiles);
  allFiles.forEach(f => analyzeFile(path.join(SAMPLE_DIR, f)));
}
