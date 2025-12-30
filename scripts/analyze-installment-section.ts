/**
 * 현대카드 할부 섹션 상세 분석
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
  console.log('\n' + '='.repeat(80));
  console.log(`파일: ${path.basename(filePath)}`);
  console.log('='.repeat(80));

  const buffer = fs.readFileSync(filePath);
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json<ExcelRow>(sheet, { header: 1 });

  // 공백 제거 후 키워드 검색
  let overseasSubtotalRow = -1;
  let installmentSubtotalRow = -1;

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (!row) continue;
    // 공백을 모두 제거하고 비교
    const rowStrNoSpace = row.map((c) => String(c || '')).join('').replace(/\s+/g, '');

    if (rowStrNoSpace.includes('해외이용소계')) {
      overseasSubtotalRow = i;
      console.log(`[발견] 해외이용소계: 행${i}`);
    }
    if (rowStrNoSpace.includes('할부소계')) {
      installmentSubtotalRow = i;
      console.log(`[발견] 할부소계: 행${i}`);
      break;
    }
  }

  console.log(`\n할부 섹션 범위: 행${overseasSubtotalRow + 1} ~ 행${installmentSubtotalRow - 1}`);

  // 할부 섹션 내 모든 행 출력
  console.log('\n[할부 섹션 상세]');
  console.log('-'.repeat(120));

  let installmentCount = 0;
  let installmentTotal = 0;

  for (let i = overseasSubtotalRow + 1; i < installmentSubtotalRow; i++) {
    const row = data[i] as ExcelRow;
    if (!row || row.length === 0) continue;

    // 전체 행 출력 (처음 10개 컬럼)
    const rowStr = row.slice(0, 10).map((c, idx) => {
      const val = String(c || '').substring(0, 15).padEnd(15);
      return `[${idx}]${val}`;
    }).join(' ');

    const merchantCell = String(row[2] || '').trim();
    const installmentCell = String(row[4] || '').trim();

    // 소계/합계 스킵
    if (merchantCell.replace(/\s+/g, '').includes('소계') ||
        merchantCell.replace(/\s+/g, '').includes('합계')) {
      console.log(`행${i} [SKIP]: ${rowStr}`);
      continue;
    }

    // 금액 추출 (인덱스 6 또는 7)
    const amount6 = parseAmount(row[6]);
    const amount7 = parseAmount(row[7]);
    const amount = amount6 !== 0 ? amount6 : amount7;

    if (amount > 0) {
      installmentCount++;
      installmentTotal += amount;
      console.log(`행${i} [할부]: ${rowStr}`);
    } else {
      console.log(`행${i} [???]: ${rowStr}`);
    }
  }

  console.log('-'.repeat(120));
  console.log(`\n[결과] 기존할부 ${installmentCount}건, 총 ${installmentTotal.toLocaleString()}원`);
}

const files = fs.readdirSync(SAMPLE_DIR).filter(f => f.includes('hyundai'));
if (files.length > 0) {
  // 파일 (4) 분석 - 10월 파일로 추정
  const targetFile = files.find(f => f.includes('(4)')) || files[0];
  analyzeFile(path.join(SAMPLE_DIR, targetFile));
}
