/**
 * 샘플 파일 파싱 테스트 스크립트
 * API 업로드와 동일한 로직으로 각 파일을 파싱하고 결과를 출력
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const sampleDir = path.join(__dirname, '..', 'sample-data');
const files = fs.readdirSync(sampleDir).filter(f => f.endsWith('.xls') || f.endsWith('.xlsx'));

// 간단한 금액 파싱 함수
function parseAmount(value) {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return Math.abs(value);
  const str = String(value).replace(/[,원\s]/g, '');
  const num = parseFloat(str);
  return isNaN(num) ? 0 : Math.abs(num);
}

// 현대카드 파서 (수정된 버전)
function parseHyundai(data) {
  const transactions = [];
  let headerRowIndex = -1;

  // 헤더 찾기
  for (let i = 0; i < Math.min(10, data.length); i++) {
    const row = data[i];
    if (!row) continue;
    const rowStr = row.map(c => String(c || '')).join(' ');
    if (rowStr.includes('결제원금') && rowStr.includes('이용일')) {
      headerRowIndex = i;
      break;
    }
  }

  if (headerRowIndex === -1) return { transactions: [], error: '헤더 없음' };

  let currentDate = null;
  const skipKeywords = ['소비쿠폰', '청구할인', '상품권사용', '민생회복', '할인', '소계', '합계'];

  for (let i = headerRowIndex + 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;

    // 날짜 추출
    const dateCell = String(row[0] || '').trim();
    if (dateCell) {
      const match = dateCell.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
      if (match) {
        currentDate = `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
      }
    }

    if (!currentDate) continue;

    // 가맹점명
    const merchantCell = String(row[2] || '').trim();
    if (!merchantCell) continue;

    // 스킵 키워드 확인
    if (skipKeywords.some(k => merchantCell.includes(k))) continue;

    // 금액 추출 (결제원금 -> 예상적립/할인 -> 가맹점명)
    let amount = parseAmount(row[7]); // 결제원금
    if (amount <= 0) {
      amount = parseAmount(row[6]); // 예상적립/할인
    }
    if (amount <= 0) {
      const match = merchantCell.match(/([\d,]+)$/);
      if (match) amount = parseAmount(match[1]);
    }

    if (amount <= 0) continue;

    // 가맹점명에서 금액 제거
    const merchant = merchantCell.replace(/[\d,]+\.{0,3}$/, '').replace(/-[\d,]+$/, '').trim();

    transactions.push({ date: currentDate, merchant, amount });
  }

  return { transactions };
}

// KB 파서
function parseKB(data) {
  const transactions = [];
  let currentDate = null;
  const skipKeywords = ['My WE:SH', '무이자혜택', '할인', '혜택', '포인트', '소계', '합계'];

  for (let i = 2; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;

    const dateCell = String(row[0] || '').trim();
    if (dateCell) {
      const match = dateCell.match(/^(\d{2})\.(\d{2})\.(\d{2})$/);
      if (match) {
        currentDate = `20${match[1]}-${match[2]}-${match[3]}`;
      }
    }

    if (!currentDate) continue;

    const merchantCell = String(row[3] || '').trim();
    if (!merchantCell) continue;
    if (skipKeywords.some(k => merchantCell.toLowerCase().includes(k.toLowerCase()))) continue;

    const amount = parseAmount(row[8]); // 원금
    if (amount <= 0) continue;

    transactions.push({ date: currentDate, merchant: merchantCell, amount });
  }

  return { transactions };
}

// 롯데 파서
function parseLotte(sheetData) {
  const data = sheetData[1] || sheetData[0]; // Sheet2 우선
  if (!data) return { transactions: [], error: '데이터 없음' };

  const transactions = [];

  for (let i = 2; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;

    const dateCell = row[0];
    if (!dateCell) continue;

    let parsedDate = null;
    if (typeof dateCell === 'number' && dateCell > 40000) {
      const excelEpoch = new Date(1899, 11, 30);
      const date = new Date(excelEpoch.getTime() + dateCell * 24 * 60 * 60 * 1000);
      parsedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }

    if (!parsedDate) continue;

    const merchantCell = String(row[2] || '').trim();
    if (!merchantCell) continue;
    if (merchantCell.includes('합계') || merchantCell.includes('소계')) continue;

    const amount = parseAmount(row[6]); // 원금
    if (amount <= 0) continue;

    transactions.push({ date: parsedDate, merchant: merchantCell, amount });
  }

  return { transactions };
}

// 삼성 파서
function parseSamsung(sheetData) {
  const transactions = [];

  for (const data of sheetData) {
    if (!data || data.length === 0) continue;

    const firstCell = String(data[0]?.[0] || '').trim();
    if (firstCell !== '일시불' && firstCell !== '할부') continue;

    // 헤더 찾기
    let headerRowIndex = -1;
    for (let i = 0; i < Math.min(10, data.length); i++) {
      const row = data[i];
      if (!row) continue;
      const rowStr = row.map(c => String(c || '')).join(' ');
      if (rowStr.includes('이용일') && rowStr.includes('가맹점')) {
        headerRowIndex = i;
        break;
      }
    }

    if (headerRowIndex === -1) continue;

    for (let i = headerRowIndex + 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0) continue;

      const merchantCell = String(row[2] || '').trim();
      if (merchantCell.includes('합계') || merchantCell.includes('소계') || merchantCell.includes('미리입금')) continue;

      const dateCell = String(row[0] || '').trim();
      if (!dateCell) continue;

      const match = dateCell.match(/^(\d{4})(\d{2})(\d{2})$/);
      if (!match) continue;

      const parsedDate = `${match[1]}-${match[2]}-${match[3]}`;
      const amount = parseAmount(row[9]); // 원금
      if (amount <= 0) continue;

      transactions.push({ date: parsedDate, merchant: merchantCell, amount });
    }
  }

  return { transactions };
}

console.log('=== Sample Data Parsing Test ===\n');

let totalTransactions = 0;
const results = [];

for (const file of files) {
  const filePath = path.join(sampleDir, file);

  try {
    const workbook = XLSX.readFile(filePath);
    const allSheetData = workbook.SheetNames.map(name =>
      XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, defval: '' })
    );

    let result;
    const fileNameLower = file.toLowerCase();

    if (fileNameLower.includes('hyundai') || fileNameLower.includes('현대')) {
      result = parseHyundai(allSheetData[0]);
      result.parser = '현대카드';
    } else if (fileNameLower.includes('samsung') || fileNameLower.includes('삼성')) {
      result = parseSamsung(allSheetData);
      result.parser = '삼성카드';
    } else if (fileNameLower.includes('lotte') || fileNameLower.includes('롯데') || fileNameLower.includes('이용대금명세서')) {
      result = parseLotte(allSheetData);
      result.parser = '롯데카드';
    } else if (fileNameLower.includes('usage')) {
      result = parseKB(allSheetData[0]);
      result.parser = 'KB국민카드';
    } else {
      result = { transactions: [], error: '파서 미확인', parser: '?' };
    }

    const count = result.transactions.length;
    const total = result.transactions.reduce((sum, t) => sum + t.amount, 0);

    console.log(`📄 ${file}`);
    console.log(`   Parser: ${result.parser}`);
    console.log(`   Transactions: ${count}건`);
    console.log(`   Total Amount: ${total.toLocaleString()}원`);
    if (result.error) console.log(`   Error: ${result.error}`);
    console.log('');

    totalTransactions += count;
    results.push({ file, parser: result.parser, count, total, transactions: result.transactions });

  } catch (e) {
    console.log(`📄 ${file}`);
    console.log(`   ❌ Error: ${e.message}\n`);
  }
}

console.log('='.repeat(60));
console.log(`총 거래 건수: ${totalTransactions}건`);
console.log('='.repeat(60));
