const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');

// .env 파일에서 API 키 읽기
const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const match = envContent.match(/ANTHROPIC_API_KEY=(.+)/);
const apiKey = match ? match[1].trim() : '';

console.log('API Key 형식:', apiKey ? apiKey.substring(0, 25) + '...' : 'NOT SET');
console.log('API Key 길이:', apiKey.length);

const client = new Anthropic({ apiKey });

async function test() {
  try {
    console.log('\n테스트 요청 전송 중...');
    const res = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 50,
      messages: [{ role: 'user', content: '안녕' }]
    });
    console.log('✅ API 성공!');
    console.log('응답:', res.content[0].text);
  } catch (err) {
    console.log('❌ API 실패!');
    console.log('상태 코드:', err.status);
    console.log('에러 메시지:', err.message);
    if (err.error) {
      console.log('에러 상세:', JSON.stringify(err.error, null, 2));
    }
  }
}

test();
