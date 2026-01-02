const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const urlMatch = envContent.match(/SUPABASE_URL=(.+)/);
const keyMatch = envContent.match(/SUPABASE_ANON_KEY=(.+)/) || envContent.match(/SUPABASE_KEY=(.+)/);

const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

async function deleteAll() {
  console.log('category_mappings 삭제 시도...');

  // 방법 1: neq 사용
  const result1 = await supabase
    .from('category_mappings')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  console.log('방법 1 결과:', result1.error ? `에러: ${result1.error.message}` : '성공');
  console.log('삭제된 행 수:', result1.count);

  // 남은 개수 확인
  const { count } = await supabase
    .from('category_mappings')
    .select('*', { count: 'exact', head: true });

  console.log('남은 개수:', count);

  if (count > 0) {
    console.log('\n방법 2: gte 사용...');
    const result2 = await supabase
      .from('category_mappings')
      .delete()
      .gte('created_at', '1970-01-01');

    console.log('방법 2 결과:', result2.error ? `에러: ${result2.error.message}` : '성공');

    const { count: remaining } = await supabase
      .from('category_mappings')
      .select('*', { count: 'exact', head: true });
    console.log('최종 남은 개수:', remaining);
  }
}

deleteAll();
