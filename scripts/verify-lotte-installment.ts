/**
 * 롯데카드 할부 거래 수수료 포함 검증
 * 현대자동차(주): 원금 833,300 + 수수료 30,566 = 863,866원이 되어야 함
 */

import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { LotteParser } from '../src/lib/loaders/lotte';

const SAMPLE_DIR = path.join(__dirname, '../sample-data');

// 롯데카드 파일 찾기
const lotteFiles = fs.readdirSync(SAMPLE_DIR).filter(f => f.includes('이용대금명세서'));

console.log('=== 롯데카드 할부 거래 수수료 포함 검증 ===\n');

for (const fileName of lotteFiles) {
  const filePath = path.join(SAMPLE_DIR, fileName);
  const buffer = fs.readFileSync(filePath);
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const allSheetData = workbook.SheetNames.map(name =>
    XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1 })
  );

  const parser = new LotteParser();
  const result = parser.parse(allSheetData as unknown[][], fileName);

  if (!result.success) {
    console.log(`${fileName}: 파싱 실패 - ${result.error}`);
    continue;
  }

  // 현대자동차 거래 찾기
  const hyundaiTransactions = result.data.filter(t => t.merchant.includes('현대자동차'));

  if (hyundaiTransactions.length > 0) {
    console.log(`[${fileName}]`);
    console.log(`총 거래: ${result.data.length}건, 총액: ${result.total_amount.toLocaleString()}원\n`);

    console.log('[현대자동차 거래]');
    hyundaiTransactions.forEach((t, idx) => {
      console.log(`  ${idx + 1}. ${t.date} | ${t.merchant}`);
      console.log(`     금액: ${t.amount.toLocaleString()}원 (할부: ${t.is_installment ? '예' : '아니오'})`);

      // 863,866원인지 확인
      if (t.amount === 863866) {
        console.log('     ✓ 원금+수수료 정확히 반영됨');
      } else if (t.amount === 833300) {
        console.log('     ✗ 수수료 미반영 (원금만)');
      }
    });
    console.log();
  }

  // 기존할부 거래 모두 출력
  const installmentTransactions = result.data.filter(t => t.is_installment);
  if (installmentTransactions.length > 0) {
    console.log(`[기존할부 거래 목록] (${installmentTransactions.length}건)`);
    installmentTransactions.forEach((t, idx) => {
      console.log(`  ${idx + 1}. ${t.date} | ${t.merchant.substring(0, 20).padEnd(20)} | ${t.amount.toLocaleString()}원`);
    });
    console.log();
  }
}
