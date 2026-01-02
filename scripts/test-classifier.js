/**
 * AI 분류기 테스트 스크립트
 */
const fs = require('fs');
const path = require('path');

// .env 파일 직접 읽기
const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
envContent.split('\n').forEach((line) => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length) {
    process.env[key.trim()] = valueParts.join('=').trim();
  }
});

const Anthropic = require('@anthropic-ai/sdk').default;

async function testClassifier() {
  console.log('=== AI 분류기 테스트 ===\n');

  const apiKey = process.env.ANTHROPIC_API_KEY;
  console.log('API Key 형식:', apiKey ? apiKey.substring(0, 20) + '...' : '없음');
  console.log('API Key 길이:', apiKey?.length || 0);

  if (!apiKey) {
    console.error('❌ ANTHROPIC_API_KEY가 설정되지 않았습니다.');
    return;
  }

  const client = new Anthropic({ apiKey });

  // 테스트 거래 데이터
  const testItems = [
    { merchant: '스타벅스 강남점', amount: 5500 },
    { merchant: '이마트 성수점', amount: 45000 },
    { merchant: '넷플릭스', amount: 17000 },
    { merchant: '서울아산병원', amount: 35000 },
  ];

  console.log('\n테스트 항목:');
  testItems.forEach((item, i) => {
    console.log(`  ${i + 1}. ${item.merchant} - ${item.amount.toLocaleString()}원`);
  });

  const prompt = `다음 거래 내역들을 카테고리로 분류해주세요.
사용 가능한 카테고리: 식비, 교통, 쇼핑, 의료, 문화/여가, 교육, 통신, 주거, 공과금, 보험, 저축/투자, 기타

각 항목에 대해 JSON 배열로 응답해주세요. 형식: [{"merchant": "...", "category": "..."}]

거래 목록:
${testItems.map((item, i) => `${i + 1}. ${item.merchant} - ${item.amount}원`).join('\n')}
`;

  console.log('\n분류 요청 전송 중...');

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    });

    console.log('\n✅ 분류 성공!');
    console.log('응답:', response.content[0].text);
  } catch (error) {
    console.error('\n❌ 분류 실패:', error.message);
    if (error.status === 401) {
      console.error('   → API 키가 유효하지 않습니다.');
    }
  }
}

testClassifier();
