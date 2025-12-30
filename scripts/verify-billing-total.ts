/**
 * 청구금액 추출 검증 스크립트
 * sample-data의 각 파일에서 billing_total을 추출하여 검증
 */

import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { HyundaiParser } from '../src/lib/loaders/hyundai';
import { LotteParser } from '../src/lib/loaders/lotte';
import { SamsungParser } from '../src/lib/loaders/samsung';
import { KBParser } from '../src/lib/loaders/kb';

const SAMPLE_DIR = path.join(__dirname, '../sample-data');

function parseFile(filePath: string) {
  const fileName = path.basename(filePath);
  const buffer = fs.readFileSync(filePath);
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const allSheetData = workbook.SheetNames.map(name =>
    XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1 })
  );

  // 파서 선택
  const parsers = [
    new HyundaiParser(),
    new LotteParser(),
    new SamsungParser(),
    new KBParser(),
  ];

  for (const parser of parsers) {
    const headers = (allSheetData[0] as unknown[][])
      .flat()
      .map(c => String(c || ''))
      .filter(s => s.trim());

    if (parser.canParse(fileName, headers)) {
      return parser.parse(allSheetData as unknown[][], fileName);
    }
  }

  return null;
}

console.log('=== 청구금액(billing_total) 추출 검증 ===\n');

const files = fs.readdirSync(SAMPLE_DIR).filter(f =>
  f.endsWith('.xls') || f.endsWith('.xlsx')
);

const results: {
  file: string;
  sourceType: string;
  usageAmount: number;
  billingTotal: number | undefined;
  diff: number | undefined;
}[] = [];

for (const file of files) {
  const filePath = path.join(SAMPLE_DIR, file);
  const result = parseFile(filePath);

  if (result && result.success) {
    const diff = result.billing_total
      ? result.total_amount - result.billing_total
      : undefined;

    results.push({
      file: file.substring(0, 40),
      sourceType: result.source_type,
      usageAmount: result.total_amount,
      billingTotal: result.billing_total,
      diff,
    });
  }
}

// 결과 출력
console.log('파일명                                  | 카드사      | 이용금액      | 청구금액      | 차이');
console.log('-'.repeat(100));

for (const r of results) {
  const usageStr = r.usageAmount.toLocaleString().padStart(12);
  const billingStr = r.billingTotal
    ? r.billingTotal.toLocaleString().padStart(12)
    : '-'.padStart(12);
  const diffStr = r.diff !== undefined
    ? (r.diff >= 0 ? '+' : '') + r.diff.toLocaleString()
    : '-';

  console.log(
    `${r.file.padEnd(40)} | ${r.sourceType.padEnd(10)} | ${usageStr} | ${billingStr} | ${diffStr}`
  );
}

// 카드사별 합계
console.log('\n=== 카드사별 합계 ===\n');

const byCard: Record<string, { usage: number; billing: number }> = {};
for (const r of results) {
  if (!byCard[r.sourceType]) {
    byCard[r.sourceType] = { usage: 0, billing: 0 };
  }
  byCard[r.sourceType].usage += r.usageAmount;
  byCard[r.sourceType].billing += r.billingTotal || 0;
}

for (const [card, data] of Object.entries(byCard)) {
  console.log(`${card}: 이용 ${data.usage.toLocaleString()}원, 청구 ${data.billing.toLocaleString()}원`);
}
