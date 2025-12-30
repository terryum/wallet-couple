/**
 * KB카드, 롯데카드 파일 구조 분석
 */

import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

const SAMPLE_DIR = path.join(__dirname, '../sample-data');

function analyzeFile(filePath: string, cardType: string) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`[${cardType}] ${path.basename(filePath)}`);
  console.log('='.repeat(80));

  const buffer = fs.readFileSync(filePath);
  const workbook = XLSX.read(buffer, { type: 'buffer' });

  console.log(`시트 목록: ${workbook.SheetNames.join(', ')}`);

  for (let sheetIdx = 0; sheetIdx < workbook.SheetNames.length; sheetIdx++) {
    const sheetName = workbook.SheetNames[sheetIdx];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][];

    console.log(`\n--- 시트 ${sheetIdx}: ${sheetName} (${data.length}행) ---`);

    // 합계 관련 행 찾기
    for (let i = 0; i < data.length; i++) {
      const row = data[i] as (string | number | null)[];
      if (!row) continue;

      const rowStr = row.map(c => String(c || '')).join(' ');

      // 합계, 총합계, 청구금액 등 관련 키워드
      if (rowStr.includes('합계') || rowStr.includes('청구') || rowStr.includes('결제')) {
        // 숫자 찾기
        const numbers = row.filter(c => typeof c === 'number' && c > 1000);
        console.log(`행${i}: ${row.slice(0, 12).map(c => String(c || '').substring(0, 12)).join(' | ')}`);
        if (numbers.length > 0) {
          console.log(`  → 숫자들: ${numbers.map(n => (n as number).toLocaleString()).join(', ')}`);
        }
      }
    }
  }
}

// KB카드 파일 분석
const kbFiles = fs.readdirSync(SAMPLE_DIR).filter(f => f.includes('usage') && !f.startsWith('~$'));
console.log('\n\n========== KB카드 파일 분석 ==========');
kbFiles.forEach(f => analyzeFile(path.join(SAMPLE_DIR, f), 'KB카드'));

// 롯데카드 파일 분석
const lotteFiles = fs.readdirSync(SAMPLE_DIR).filter(f => f.includes('이용대금명세서'));
console.log('\n\n========== 롯데카드 파일 분석 ==========');
lotteFiles.forEach(f => analyzeFile(path.join(SAMPLE_DIR, f), '롯데카드'));
