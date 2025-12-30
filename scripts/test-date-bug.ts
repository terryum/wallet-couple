/**
 * 날짜 계산 버그 확인
 */

// 현재 쿼리의 endDate 계산 방식
function getCurrentEndDate(month: string): string {
  const [year, monthNum] = month.split('-').map(Number);
  const endDate = new Date(year, monthNum, 0).toISOString().split('T')[0];
  return endDate;
}

// 올바른 계산 방식
function getCorrectEndDate(month: string): string {
  const [year, monthNum] = month.split('-').map(Number);
  const lastDay = new Date(year, monthNum, 0).getDate();
  return `${month}-${String(lastDay).padStart(2, '0')}`;
}

console.log('=== 날짜 계산 버그 확인 ===\n');

const testMonths = ['2025-10', '2025-11', '2025-12', '2025-02'];

for (const month of testMonths) {
  const current = getCurrentEndDate(month);
  const correct = getCorrectEndDate(month);
  const isBug = current !== correct;

  console.log(`${month}:`);
  console.log(`  현재 방식 (toISOString): ${current}`);
  console.log(`  올바른 방식: ${correct}`);
  console.log(`  버그 여부: ${isBug ? '❌ 버그!' : '✓ 정상'}`);
  console.log();
}

// 상세 분석
console.log('=== 상세 분석 ===\n');
const oct = new Date(2025, 10, 0); // 10월 마지막 날
console.log('new Date(2025, 10, 0):');
console.log(`  로컬: ${oct.toString()}`);
console.log(`  UTC ISO: ${oct.toISOString()}`);
console.log(`  getDate(): ${oct.getDate()}`);
console.log(`  getMonth(): ${oct.getMonth()} (0-indexed)`);
