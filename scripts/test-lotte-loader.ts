/**
 * 롯데카드 로더 테스트 - 본죽 거래 확인
 */

import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { LotteParser } from '../src/lib/loaders/lotte';

const SAMPLE_DIR = path.join(__dirname, '../sample-data');

function testFile(filePath: string) {
  console.log('\n' + '='.repeat(80));
  console.log(`파일: ${path.basename(filePath)}`);
  console.log('='.repeat(80));

  const buffer = fs.readFileSync(filePath);
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const allSheetData = workbook.SheetNames.map(name =>
    XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1 })
  );

  const parser = new LotteParser();
  const result = parser.parse(allSheetData as unknown[][], path.basename(filePath));

  console.log(`\n파싱 결과: ${result.success ? '성공' : '실패'}`);
  if (!result.success) {
    console.log(`에러: ${result.error}`);
    return;
  }

  console.log(`총 거래 수: ${result.data.length}건`);
  console.log(`총 금액: ${result.total_amount.toLocaleString()}원`);

  // 본죽 거래 찾기
  const bonjukTransactions = result.data.filter(t => t.merchant.includes('본죽'));
  console.log(`\n[본죽 거래]`);
  console.log(`발견된 본죽 거래: ${bonjukTransactions.length}건`);
  bonjukTransactions.forEach((t, idx) => {
    console.log(`  ${idx + 1}. ${t.date} | ${t.merchant} | ${t.amount.toLocaleString()}원`);
  });

  // 10월 31일 거래
  const oct31Transactions = result.data.filter(t => t.date === '2025-10-31');
  console.log(`\n[2025-10-31 거래]`);
  console.log(`발견된 거래: ${oct31Transactions.length}건`);
  oct31Transactions.forEach((t, idx) => {
    console.log(`  ${idx + 1}. ${t.merchant} | ${t.amount.toLocaleString()}원`);
  });

  // 모든 거래 출력 (디버깅용)
  console.log(`\n[모든 거래 목록]`);
  result.data.forEach((t, idx) => {
    console.log(`  ${idx + 1}. ${t.date} | ${t.merchant.substring(0, 25).padEnd(25)} | ${t.amount.toLocaleString()}원`);
  });
}

// 모든 이용대금명세서 파일에서 본죽 거래 확인
console.log('\n====== 모든 롯데카드 파일 본죽 거래 비교 ======\n');
const lotteFiles = fs.readdirSync(SAMPLE_DIR).filter(f => f.includes('이용대금명세서')).sort();
lotteFiles.forEach(f => testFile(path.join(SAMPLE_DIR, f)));
