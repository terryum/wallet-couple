const XLSX = require('xlsx');
const path = require('path');

const filePath = 'C:\\Users\\terry\\Downloads\\거래내역조회20251231.xls';

console.log('=== 우리은행 거래내역 분석 ===\n');

const workbook = XLSX.readFile(filePath);

console.log('시트 목록:', workbook.SheetNames);

workbook.SheetNames.forEach((sheetName, sheetIdx) => {
  console.log(`\n--- 시트 ${sheetIdx + 1}: "${sheetName}" ---`);

  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  console.log(`총 행 수: ${data.length}`);

  // 첫 10개 행 출력
  console.log('\n처음 10개 행:');
  data.slice(0, 10).forEach((row, idx) => {
    console.log(`행 ${idx}: ${JSON.stringify(row)}`);
  });

  // 헤더 찾기 (거래일자, 적요 등이 포함된 행)
  let headerRowIdx = -1;
  for (let i = 0; i < Math.min(10, data.length); i++) {
    const rowStr = data[i].join(' ').toLowerCase();
    if (rowStr.includes('거래일') || rowStr.includes('적요') || rowStr.includes('금액')) {
      headerRowIdx = i;
      console.log(`\n헤더 행 발견: ${i}`);
      console.log('헤더:', data[i]);
      break;
    }
  }

  if (headerRowIdx >= 0 && data.length > headerRowIdx + 1) {
    console.log('\n데이터 샘플 (헤더 다음 5개 행):');
    data.slice(headerRowIdx + 1, headerRowIdx + 6).forEach((row, idx) => {
      console.log(`데이터 ${idx + 1}:`, row);
    });
  }
});
