/**
 * 성남사랑상품권 (chak) 샘플 파일 분석 스크립트
 */

const XlsxPopulate = require('xlsx-populate');
const path = require('path');

async function analyzeChakFile() {
  const filePath = path.join(__dirname, '../sample-data/chak_이용내역_결제_20251230_73928.xlsx');
  const password = '19840222';

  try {
    console.log('파일 열기 시도:', filePath);
    const workbook = await XlsxPopulate.fromFileAsync(filePath, { password });

    const sheets = workbook.sheets();
    console.log('\n=== 시트 목록 ===');
    sheets.forEach((sheet, idx) => {
      console.log(`${idx}: ${sheet.name()}`);
    });

    // 첫 번째 시트 분석
    const sheet = sheets[0];
    const usedRange = sheet.usedRange();

    if (!usedRange) {
      console.log('데이터 없음');
      return;
    }

    const startRow = usedRange.startCell().rowNumber();
    const endRow = usedRange.endCell().rowNumber();
    const startCol = usedRange.startCell().columnNumber();
    const endCol = usedRange.endCell().columnNumber();

    console.log(`\n=== 사용 범위 ===`);
    console.log(`행: ${startRow} ~ ${endRow}`);
    console.log(`열: ${startCol} ~ ${endCol}`);

    console.log('\n=== 첫 10행 데이터 ===');
    for (let r = startRow; r <= Math.min(startRow + 9, endRow); r++) {
      const row = [];
      for (let c = startCol; c <= endCol; c++) {
        const value = sheet.cell(r, c).value();
        row.push(value !== undefined ? value : '');
      }
      console.log(`Row ${r}:`, row);
    }

    // 헤더 찾기
    console.log('\n=== 헤더 분석 ===');
    for (let r = startRow; r <= Math.min(startRow + 5, endRow); r++) {
      const row = [];
      for (let c = startCol; c <= endCol; c++) {
        const value = sheet.cell(r, c).value();
        if (value && typeof value === 'string') {
          row.push(`[${c}]${value}`);
        }
      }
      if (row.length > 0) {
        console.log(`Row ${r}:`, row.join(', '));
      }
    }

    // 데이터 샘플 (헤더 다음 행부터)
    console.log('\n=== 데이터 샘플 ===');
    for (let r = startRow + 1; r <= Math.min(startRow + 5, endRow); r++) {
      const row = [];
      for (let c = startCol; c <= endCol; c++) {
        const value = sheet.cell(r, c).value();
        row.push(value !== undefined ? value : '');
      }
      console.log(`Row ${r}:`, row);
    }

    // 마지막 몇 행도 확인
    console.log('\n=== 마지막 5행 ===');
    for (let r = Math.max(startRow, endRow - 4); r <= endRow; r++) {
      const row = [];
      for (let c = startCol; c <= endCol; c++) {
        const value = sheet.cell(r, c).value();
        row.push(value !== undefined ? value : '');
      }
      console.log(`Row ${r}:`, row);
    }

  } catch (error) {
    console.error('에러:', error.message);
  }
}

analyzeChakFile();
