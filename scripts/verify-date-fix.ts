/**
 * 날짜 버그 수정 검증 스크립트
 * 10월 지출 총액이 251,164원이 되어야 함
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('SUPABASE_URL과 SUPABASE_KEY 환경변수를 설정해주세요.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyOctoberTotal() {
  console.log('=== 날짜 버그 수정 검증 ===\n');

  // 수정된 날짜 계산 방식
  const month = '2025-10';
  const [year, monthNum] = month.split('-').map(Number);
  const lastDay = new Date(year, monthNum, 0).getDate();
  const startDate = `${month}-01`;
  const endDate = `${month}-${String(lastDay).padStart(2, '0')}`;

  console.log(`조회 기간: ${startDate} ~ ${endDate}`);
  console.log(`마지막 날: ${lastDay}일\n`);

  // 10월 전체 거래 조회
  const { data: allOctTransactions, error: allError } = await supabase
    .from('transactions')
    .select('*')
    .eq('is_deleted', false)
    .gte('transaction_date', startDate)
    .lte('transaction_date', endDate)
    .order('transaction_date', { ascending: true });

  if (allError) {
    console.error('조회 오류:', allError.message);
    return;
  }

  console.log(`10월 전체 거래 수: ${allOctTransactions?.length || 0}건\n`);

  // 10월 31일 거래만 조회
  const oct31Transactions = allOctTransactions?.filter(t => t.transaction_date === '2025-10-31') || [];
  console.log('[10월 31일 거래]');
  console.log(`거래 수: ${oct31Transactions.length}건`);
  oct31Transactions.forEach((t, idx) => {
    console.log(`  ${idx + 1}. ${t.merchant_name} | ${t.amount.toLocaleString()}원`);
  });

  // 본죽 거래 확인
  const bonjukTransactions = allOctTransactions?.filter(t => t.merchant_name.includes('본죽')) || [];
  console.log(`\n[본죽 거래]`);
  console.log(`거래 수: ${bonjukTransactions.length}건`);
  bonjukTransactions.forEach((t, idx) => {
    console.log(`  ${idx + 1}. ${t.transaction_date} | ${t.merchant_name} | ${t.amount.toLocaleString()}원`);
  });

  // 총액 계산
  const total = allOctTransactions?.reduce((sum, t) => sum + t.amount, 0) || 0;
  const expectedTotal = 251164;

  console.log(`\n[검증 결과]`);
  console.log(`계산된 10월 총액: ${total.toLocaleString()}원`);
  console.log(`예상 총액: ${expectedTotal.toLocaleString()}원`);
  console.log(`일치 여부: ${total === expectedTotal ? '✓ 성공!' : `✗ 실패 (차이: ${(total - expectedTotal).toLocaleString()}원)`}`);

  // 날짜별 거래 수 출력
  console.log(`\n[날짜별 거래 수]`);
  const dateCount: Record<string, number> = {};
  allOctTransactions?.forEach(t => {
    dateCount[t.transaction_date] = (dateCount[t.transaction_date] || 0) + 1;
  });
  const sortedDates = Object.keys(dateCount).sort();
  sortedDates.slice(-5).forEach(date => {
    console.log(`  ${date}: ${dateCount[date]}건`);
  });
}

verifyOctoberTotal().catch(console.error);
