const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const urlMatch = envContent.match(/SUPABASE_URL=(.+)/);
const keyMatch = envContent.match(/SUPABASE_ANON_KEY=(.+)/) || envContent.match(/SUPABASE_KEY=(.+)/);

const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

async function check() {
  const { data: catMappings, count: catCount } = await supabase
    .from('category_mappings')
    .select('*', { count: 'exact' })
    .limit(5);

  const { data: merchantMappings, count: merchantCount } = await supabase
    .from('merchant_name_mappings')
    .select('*', { count: 'exact' })
    .limit(5);

  console.log('=== category_mappings ===');
  console.log('총 개수:', catCount);
  if (catMappings && catMappings.length > 0) {
    catMappings.forEach(m => console.log('  ', m.pattern, '→', m.category));
  }

  console.log('\n=== merchant_name_mappings ===');
  console.log('총 개수:', merchantCount);
  if (merchantMappings && merchantMappings.length > 0) {
    merchantMappings.forEach(m => console.log('  ', m.original_pattern, '→', m.preferred_name));
  }
}

check();
