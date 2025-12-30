/**
 * 수정된 현대카드 로더 테스트
 */

import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { HyundaiParser } from '../src/lib/loaders/hyundai';

const SAMPLE_DIR = path.join(__dirname, '../sample-data');

function testFile(filePath: string) {
  const fileName = path.basename(filePath);

  const buffer = fs.readFileSync(filePath);
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const allSheetData = workbook.SheetNames.map(name =>
    XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1 })
  );

  const parser = new HyundaiParser();
  const result = parser.parse(allSheetData as unknown[][], fileName);

  if (!result.success) {
    console.log(`${fileName}: 실패 - ${result.error}`);
    return;
  }

  // 기존할부 거래 필터링
  const installmentTransactions = result.data.filter(t => t.is_installment);
  const installmentTotal = installmentTransactions.reduce((sum, t) => sum + t.amount, 0);

  // 첫 행에서 청구월 추출
  const firstRow = String((allSheetData[0] as unknown[][])?.[0] || '');
  const billingMatch = firstRow.match(/(\d{4})년\s*(\d{1,2})월/);
  const billingMonth = billingMatch ? `${billingMatch[1]}년 ${billingMatch[2]}월` : '알수없음';

  console.log(`\n${'='.repeat(80)}`);
  console.log(`파일: ${fileName}`);
  console.log(`청구월: ${billingMonth}`);
  console.log(`총 거래: ${result.data.length}건`);
  console.log(`기존할부: ${installmentTransactions.length}건, ${installmentTotal.toLocaleString()}원`);

  if (installmentTransactions.length > 0) {
    console.log(`\n[기존할부 내역]`);
    installmentTransactions.forEach((t, i) => {
      console.log(`  ${i + 1}. ${t.date} | ${t.merchant.substring(0, 25).padEnd(25)} | ${t.amount.toLocaleString()}원`);
    });
  }
}

console.log('현대카드 로더 테스트');
console.log('='.repeat(80));

const files = fs.readdirSync(SAMPLE_DIR).filter(f => f.includes('hyundai')).sort();
for (const file of files) {
  testFile(path.join(SAMPLE_DIR, file));
}
