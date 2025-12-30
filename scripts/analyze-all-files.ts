/**
 * 모든 현대카드 파일 할부 섹션 분석
 */

import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

const SAMPLE_DIR = path.join(__dirname, '../sample-data');

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

function analyzeFile(filePath: string) {
  const fileName = path.basename(filePath);

  const buffer = fs.readFileSync(filePath);
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json<ExcelRow>(sheet, { header: 1 });

  // 파일 제목에서 청구월 추출
  const firstRow = String(data[0] || '');
  const billingMonth = firstRow.match(/(\d{4})년\s*(\d{1,2})월/);
  const monthStr = billingMonth ? `${billingMonth[1]}년 ${billingMonth[2]}월` : '알수없음';

  // 공백 제거 후 키워드 검색
  let overseasSubtotalRow = -1;
  let installmentSubtotalRow = -1;

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (!row) continue;
    const rowStrNoSpace = row.map((c) => String(c || '')).join('').replace(/\s+/g, '');

    if (rowStrNoSpace.includes('해외이용소계')) {
      overseasSubtotalRow = i;
    }
    if (rowStrNoSpace.includes('할부소계')) {
      installmentSubtotalRow = i;
      break;
    }
  }

  // 할부 건수 계산
  let installmentCount = 0;
  let installmentTotal = 0;

  if (overseasSubtotalRow !== -1 && installmentSubtotalRow !== -1) {
    for (let i = overseasSubtotalRow + 1; i < installmentSubtotalRow; i++) {
      const row = data[i] as ExcelRow;
      if (!row || row.length === 0) continue;

      const merchantCell = String(row[2] || '').trim();
      if (merchantCell.replace(/\s+/g, '').includes('소계') ||
          merchantCell.replace(/\s+/g, '').includes('합계')) {
        continue;
      }

      const amount6 = parseAmount(row[6]);
      const amount7 = parseAmount(row[7]);
      const amount = amount6 !== 0 ? amount6 : amount7;

      if (amount > 0) {
        installmentCount++;
        installmentTotal += amount;
      }
    }
  }

  console.log(`${fileName.padEnd(35)} | 청구월: ${monthStr.padEnd(12)} | 할부 범위: ${overseasSubtotalRow + 1}-${installmentSubtotalRow - 1} | 할부: ${String(installmentCount).padStart(3)}건 | ${installmentTotal.toLocaleString().padStart(10)}원`);
}

console.log('='.repeat(120));
console.log('현대카드 파일별 기존할부 분석');
console.log('='.repeat(120));

const files = fs.readdirSync(SAMPLE_DIR).filter(f => f.includes('hyundai')).sort();
for (const file of files) {
  analyzeFile(path.join(SAMPLE_DIR, file));
}
