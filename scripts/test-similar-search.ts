/**
 * 비슷한 거래 검색 테스트 스크립트
 * 실행: npx tsx scripts/test-similar-search.ts
 */

// 키워드 추출 함수 (route.ts와 동일)
function extractMainKeyword(merchantName: string): string {
  const cleaned = merchantName
    .replace(/\d+/g, '')
    .replace(/[-_()（）\[\]\/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const words = cleaned.split(/\s+/).filter(w => w.length >= 2);

  const stopWords = [
    '주식회사', '유한회사', '한국', '대한', '코리아',
    '한국정보통신', '정보통신', '결제', '페이', '카드',
    '온라인', '오프라인', '전자', '상사',
    '서울', '부산', '대전', '대구', '인천', '광주', '울산', '세종',
    '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'
  ];

  for (const word of words) {
    if (!stopWords.includes(word)) {
      return word;
    }
  }

  return words[0] || merchantName.slice(0, 4);
}

// 테스트 케이스
const testCases = [
  // 택시 관련 - 지역명은 불용어로 제외되어 "택시"만 추출
  { input: '택시-대전61바', expected: '택시' },
  { input: '카카오택시', expected: '카카오택시' },
  { input: '택시-서울32아1234', expected: '택시' },

  // 쿠팡 관련
  { input: '한국정보통신 - 쿠팡', expected: '쿠팡' },
  { input: '쿠팡', expected: '쿠팡' },
  { input: '쿠팡로켓', expected: '쿠팡로켓' },

  // 기타
  { input: '스타벅스 강남역점', expected: '스타벅스' },
  { input: 'CU 삼성점', expected: 'CU' },
  { input: '이마트24 서초점', expected: '이마트' },

  // 지역명만 있는 경우 - fallback으로 첫 번째 단어 사용
  { input: '서울식물원', expected: '서울식물원' },
  { input: '플로트 서울', expected: '플로트' },
];

console.log('=== 비슷한 거래 검색 키워드 추출 테스트 ===\n');

let passed = 0;
let failed = 0;

for (const tc of testCases) {
  const result = extractMainKeyword(tc.input);
  const isMatch = result === tc.expected ||
    result.includes(tc.expected) ||
    tc.expected.includes(result);

  if (isMatch) {
    console.log(`✓ PASS: "${tc.input}"`);
    console.log(`  추출된 키워드: "${result}"\n`);
    passed++;
  } else {
    console.log(`✗ FAIL: "${tc.input}"`);
    console.log(`  추출된 키워드: "${result}"`);
    console.log(`  기대한 키워드: "${tc.expected}"\n`);
    failed++;
  }
}

console.log('=== 결과 ===');
console.log(`통과: ${passed}/${testCases.length}`);
console.log(`실패: ${failed}/${testCases.length}`);

// 단일 키워드 검색 조건 테스트
console.log('\n=== 검색 조건 테스트 ===');
const kw1 = extractMainKeyword('택시-대전61바');
console.log(`입력: "택시-대전61바" → 검색: "%${kw1}%"`);

const kw2 = extractMainKeyword('한국정보통신 - 쿠팡');
console.log(`입력: "한국정보통신 - 쿠팡" → 검색: "%${kw2}%"`);

const kw3 = extractMainKeyword('택시-서울32아1234');
console.log(`입력: "택시-서울32아1234" → 검색: "%${kw3}%" (서울 제외됨)`);

// 실제 DB 테스트 (API 호출)
console.log('\n=== API 호출 테스트 ===');
console.log('(서버가 실행 중이어야 함)\n');

async function testApi() {
  const testMerchants = ['택시', '쿠팡', '스타벅스'];

  for (const merchant of testMerchants) {
    try {
      const url = `http://localhost:3001/api/transactions/similar?merchant=${encodeURIComponent(merchant)}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        console.log(`✓ "${merchant}" 검색: ${data.data.length}건 발견`);
        if (data.data.length > 0) {
          console.log(`  예시: ${data.data.slice(0, 3).map((t: { merchant_name: string }) => t.merchant_name).join(', ')}`);
        }
      } else {
        console.log(`✗ "${merchant}" 검색 실패: ${data.error}`);
      }
    } catch (err) {
      console.log(`✗ "${merchant}" API 호출 실패: ${err}`);
    }
  }
}

testApi();
