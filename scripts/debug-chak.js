/**
 * 성남사랑상품권(chak) 파일 디버깅 스크립트
 */

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const XlsxPopulate = require('xlsx-populate');

const sampleDir = path.join(__dirname, '..', 'sample-data');

async function debugChakFile() {
  // chak 파일 찾기
  const files = fs.readdirSync(sampleDir);
  const chakFiles = files.filter(f => f.toLowerCase().includes('chak') && !f.startsWith('~$'));

  console.log('발견된 chak 파일들:', chakFiles);

  if (chakFiles.length === 0) {
    console.log('chak 파일을 찾을 수 없습니다.');
    return;
  }

  const testFile = chakFiles[0];
  const filePath = path.join(sampleDir, testFile);
  console.log('\n테스트 파일:', testFile);

  // 파일 읽기
  const buffer = fs.readFileSync(filePath);
  console.log('파일 크기:', buffer.length, 'bytes');

  // 1. 일반 XLSX로 시도
  console.log('\n=== 1. 일반 XLSX로 읽기 시도 ===');
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    console.log('시트 이름:', workbook.SheetNames);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    console.log('데이터 행 수:', data.length);
    console.log('첫 5행:', data.slice(0, 5));
  } catch (error) {
    console.log('XLSX 오류:', error.message);
    console.log('비밀번호 보호 여부:',
      error.message.includes('password-protected') ||
      error.message.includes("Can't find end of central directory")
    );
  }

  // 2. xlsx-populate로 비밀번호 없이 시도
  console.log('\n=== 2. xlsx-populate 비밀번호 없이 시도 ===');
  try {
    const workbook = await XlsxPopulate.fromDataAsync(buffer);
    console.log('성공! 시트 수:', workbook.sheets().length);
  } catch (error) {
    console.log('오류:', error.message);
  }

  // 3. xlsx-populate로 비밀번호(테스트용: 19901225)로 시도
  console.log('\n=== 3. xlsx-populate 비밀번호로 시도 ===');
  const testPasswords = ['19901225', '12345678', ''];

  for (const password of testPasswords) {
    console.log(`\n비밀번호 "${password}" 시도...`);
    try {
      const workbook = await XlsxPopulate.fromDataAsync(buffer, { password: password || undefined });
      console.log('성공! 시트 수:', workbook.sheets().length);

      // 데이터 읽기
      const sheet = workbook.sheets()[0];
      const usedRange = sheet.usedRange();
      if (usedRange) {
        console.log('사용 범위:',
          `${usedRange.startCell().address()} ~ ${usedRange.endCell().address()}`
        );

        // 첫 10행 출력
        const startRow = usedRange.startCell().rowNumber();
        const endRow = Math.min(startRow + 9, usedRange.endCell().rowNumber());
        const startCol = usedRange.startCell().columnNumber();
        const endCol = usedRange.endCell().columnNumber();

        console.log('\n첫 10행 데이터:');
        for (let r = startRow; r <= endRow; r++) {
          const row = [];
          for (let c = startCol; c <= endCol; c++) {
            const value = sheet.cell(r, c).value();
            row.push(value !== undefined ? value : '');
          }
          console.log(`행 ${r}:`, row);
        }
      }
      break;
    } catch (error) {
      console.log('오류:', error.message);
    }
  }
}

debugChakFile().catch(console.error);
