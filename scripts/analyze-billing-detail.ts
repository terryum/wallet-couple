/**
 * KB카드, 롯데카드 파일 상세 분석
 */

import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

const SAMPLE_DIR = path.join(__dirname, '../sample-data');

// KB카드 파일 분석
console.log('========== KB카드 상세 분석 ==========\n');
const kbFile = path.join(SAMPLE_DIR, '202509_usage (1).xlsx');
const kbBuffer = fs.readFileSync(kbFile);
const kbWorkbook = XLSX.read(kbBuffer, { type: 'buffer' });
const kbSheet = kbWorkbook.Sheets[kbWorkbook.SheetNames[0]];
const kbData = XLSX.utils.sheet_to_json(kbSheet, { header: 1 }) as unknown[][];

console.log('[KB카드] 전체 행 출력 (처음 5행, 마지막 5행):');
for (let i = 0; i < Math.min(5, kbData.length); i++) {
  const row = kbData[i] as (string | number | null)[];
  console.log(`행${i}: ${row?.slice(0, 12).map(c => String(c || '').substring(0, 15).padEnd(15)).join(' | ')}`);
}
console.log('...');
for (let i = Math.max(5, kbData.length - 5); i < kbData.length; i++) {
  const row = kbData[i] as (string | number | null)[];
  console.log(`행${i}: ${row?.slice(0, 12).map(c => String(c || '').substring(0, 15).padEnd(15)).join(' | ')}`);
}

// 롯데카드 파일 분석 - Sheet1
console.log('\n\n========== 롯데카드 Sheet1 상세 분석 ==========\n');
const lotteFile = path.join(SAMPLE_DIR, '이용대금명세서_2509(신용.체크)_20251218230959.xls');
const lotteBuffer = fs.readFileSync(lotteFile);
const lotteWorkbook = XLSX.read(lotteBuffer, { type: 'buffer' });
const lotteSheet1 = lotteWorkbook.Sheets[lotteWorkbook.SheetNames[0]];
const lotteData1 = XLSX.utils.sheet_to_json(lotteSheet1, { header: 1 }) as unknown[][];

console.log('[롯데카드 Sheet1] 전체 행 출력:');
for (let i = 0; i < lotteData1.length; i++) {
  const row = lotteData1[i] as (string | number | null)[];
  if (!row || row.length === 0) continue;
  console.log(`행${i}: ${row.map(c => String(c || '').substring(0, 20)).join(' | ')}`);
}

// 롯데카드 파일 분석 - Sheet2 마지막 부분
console.log('\n\n========== 롯데카드 Sheet2 마지막 행들 ==========\n');
const lotteSheet2 = lotteWorkbook.Sheets[lotteWorkbook.SheetNames[1]];
const lotteData2 = XLSX.utils.sheet_to_json(lotteSheet2, { header: 1 }) as unknown[][];

console.log('[롯데카드 Sheet2] 마지막 10행:');
for (let i = Math.max(0, lotteData2.length - 10); i < lotteData2.length; i++) {
  const row = lotteData2[i] as (string | number | null)[];
  if (!row) continue;
  console.log(`행${i}: ${row.slice(0, 10).map(c => String(c || '').substring(0, 15)).join(' | ')}`);
}
