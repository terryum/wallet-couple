/**
 * 성남사랑상품권(chak) 파서 테스트 스크립트
 * 수정된 로더로 테스트
 */

const fs = require('fs');
const path = require('path');

// 프로젝트 루트 설정
process.chdir(path.join(__dirname, '..'));

// 동적 import를 위한 래퍼
async function test() {
  const sampleDir = path.join(__dirname, '..', 'sample-data');

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

  // officecrypto-tool 테스트
  const officeCrypto = require('officecrypto-tool');

  const isEncrypted = officeCrypto.isEncrypted(buffer);
  console.log('\n암호화됨:', isEncrypted);

  if (isEncrypted) {
    console.log('\n비밀번호를 입력해서 테스트하세요.');
    console.log('예시: node scripts/test-chak-parser.js 19901225');

    const password = process.argv[2];
    if (!password) {
      console.log('\n사용법: node scripts/test-chak-parser.js [비밀번호]');
      return;
    }

    console.log('\n비밀번호:', password, '로 복호화 시도...');

    try {
      const decrypted = await officeCrypto.decrypt(buffer, { password });
      console.log('복호화 성공! 크기:', decrypted.length, 'bytes');

      // XLSX로 읽기
      const XLSX = require('xlsx');
      const workbook = XLSX.read(decrypted, { type: 'buffer' });
      console.log('\n시트:', workbook.SheetNames);

      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
      console.log('데이터 행 수:', data.length);

      console.log('\n첫 10행:');
      data.slice(0, 10).forEach((row, i) => {
        console.log(`${i}: ${JSON.stringify(row)}`);
      });

      // 성남사랑 파서 키워드 확인
      const hasKeywords = data.some(row => {
        const rowStr = row.map(c => String(c || '')).join(' ');
        return rowStr.includes('거래일시') && rowStr.includes('사용처') && rowStr.includes('거래금액');
      });
      console.log('\n성남사랑 파서 키워드 존재:', hasKeywords);

    } catch (error) {
      console.log('복호화 실패:', error.message);
    }
  }
}

test().catch(console.error);
