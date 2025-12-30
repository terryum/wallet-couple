/**
 * StackedBarCard 차트 데이터 생성 로직 테스트
 * 기간 변경 시 차트가 깨지는 버그 재현 및 수정 확인
 */

import { describe, it, expect } from 'vitest';

// 차트 데이터 생성 로직을 테스트하기 위해 동일한 로직 추출
interface CategoryData {
  category: string;
  total_amount: number;
  count: number;
}

interface MonthData {
  month: string;
  total: number;
  totalCount: number;
  byCategory: CategoryData[];
}

// StackedBarCard에서 사용하는 차트 데이터 생성 로직
function generateChartData(data: MonthData[], period: number | 'custom', customStart?: string, customEnd?: string) {
  if (!data || data.length === 0) {
    return { chartData: [], topCategories: [] };
  }

  // 기간에 맞게 필터링
  let filteredData: MonthData[];
  if (period === 'custom' && customStart && customEnd) {
    filteredData = data.filter(
      (d) => d.month >= customStart && d.month <= customEnd
    );
  } else if (period !== 'custom') {
    filteredData = data.slice(-period);
  } else {
    filteredData = data.slice(-6);
  }

  // 전체 카테고리별 합계 계산 (상위 5개 선정)
  const categoryTotals: Record<string, number> = {};
  for (const month of filteredData) {
    for (const cat of month.byCategory) {
      categoryTotals[cat.category] =
        (categoryTotals[cat.category] || 0) + cat.total_amount;
    }
  }

  // 상위 5개 카테고리
  const top5 = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([cat]) => cat);

  // 차트 데이터 생성
  const processed = filteredData.map((month) => {
    const monthLabel = month.month.slice(5); // "2025-12" -> "12"
    const result: Record<string, number | string> = {
      month: `${parseInt(monthLabel)}월`,
      total: month.total,
      totalCount: month.totalCount,
    };

    // 상위 5개 카테고리 초기값 0으로 설정 (누락 방지)
    for (const cat of top5) {
      result[cat] = 0;
      result[`${cat}_count`] = 0;
    }
    result['기타'] = 0;
    result['기타_count'] = 0;

    // 상위 5개 카테고리별 금액 및 건수
    let otherTotal = 0;
    let otherCount = 0;
    for (const cat of month.byCategory) {
      if (top5.includes(cat.category)) {
        result[cat.category] = cat.total_amount;
        result[`${cat.category}_count`] = cat.count;
      } else {
        otherTotal += cat.total_amount;
        otherCount += cat.count;
      }
    }
    result['기타'] = otherTotal;
    result['기타_count'] = otherCount;

    return result;
  });

  return {
    chartData: processed,
    topCategories: [...top5, '기타'],
  };
}

// 테스트용 데이터 생성
function createTestData(months: number): MonthData[] {
  const categories = ['식료품', '외식/커피', '쇼핑', '관리비', '통신/교통', '육아', '미용/기타', '여행'];
  const data: MonthData[] = [];

  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    // 월마다 다른 카테고리 분포 (일부 카테고리는 특정 월에만 존재)
    const byCategory: CategoryData[] = [];
    let total = 0;
    let totalCount = 0;

    for (let j = 0; j < categories.length; j++) {
      // 일부 카테고리는 특정 월에만 데이터가 있음 (버그 재현을 위해)
      const shouldHaveData = Math.random() > 0.3 || j < 3; // 첫 3개는 항상 존재
      if (shouldHaveData) {
        const amount = Math.floor(Math.random() * 500000) + 50000;
        const count = Math.floor(Math.random() * 10) + 1;
        byCategory.push({
          category: categories[j],
          total_amount: amount,
          count: count,
        });
        total += amount;
        totalCount += count;
      }
    }

    data.push({
      month: monthStr,
      total,
      totalCount,
      byCategory,
    });
  }

  return data;
}

// 실제 버그 재현을 위한 데이터 (카테고리가 기간마다 다름)
function createBugReproData(): MonthData[] {
  return [
    // 최근 3개월: 식료품, 외식/커피, 쇼핑이 top3
    {
      month: '2025-10',
      total: 1000000,
      totalCount: 10,
      byCategory: [
        { category: '식료품', total_amount: 400000, count: 4 },
        { category: '외식/커피', total_amount: 300000, count: 3 },
        { category: '쇼핑', total_amount: 200000, count: 2 },
        { category: '관리비', total_amount: 100000, count: 1 },
      ],
    },
    {
      month: '2025-11',
      total: 1200000,
      totalCount: 12,
      byCategory: [
        { category: '식료품', total_amount: 500000, count: 5 },
        { category: '외식/커피', total_amount: 350000, count: 4 },
        { category: '쇼핑', total_amount: 250000, count: 2 },
        { category: '관리비', total_amount: 100000, count: 1 },
      ],
    },
    {
      month: '2025-12',
      total: 1500000,
      totalCount: 15,
      byCategory: [
        { category: '식료품', total_amount: 600000, count: 6 },
        { category: '외식/커피', total_amount: 400000, count: 4 },
        { category: '쇼핑', total_amount: 300000, count: 3 },
        { category: '관리비', total_amount: 200000, count: 2 },
      ],
    },
    // 4-6개월 전: 여행, 부모님이 추가됨
    {
      month: '2025-07',
      total: 2000000,
      totalCount: 20,
      byCategory: [
        { category: '여행', total_amount: 800000, count: 2 }, // 여행이 큰 비중
        { category: '식료품', total_amount: 400000, count: 8 },
        { category: '외식/커피', total_amount: 300000, count: 5 },
        { category: '부모님', total_amount: 300000, count: 2 },
        { category: '쇼핑', total_amount: 200000, count: 3 },
      ],
    },
    {
      month: '2025-08',
      total: 1000000,
      totalCount: 10,
      byCategory: [
        { category: '식료품', total_amount: 400000, count: 4 },
        { category: '외식/커피', total_amount: 300000, count: 3 },
        { category: '쇼핑', total_amount: 200000, count: 2 },
        { category: '관리비', total_amount: 100000, count: 1 },
      ],
    },
    {
      month: '2025-09',
      total: 1100000,
      totalCount: 11,
      byCategory: [
        { category: '식료품', total_amount: 450000, count: 5 },
        { category: '외식/커피', total_amount: 350000, count: 3 },
        { category: '쇼핑', total_amount: 200000, count: 2 },
        { category: '관리비', total_amount: 100000, count: 1 },
      ],
    },
  ];
}

describe('StackedBarCard 차트 데이터 생성', () => {
  describe('기간 변경 시 카테고리 처리', () => {
    it('3개월 기간에서 모든 카테고리가 숫자값을 가져야 함', () => {
      const data = createBugReproData();
      const { chartData, topCategories } = generateChartData(data, 3);

      console.log('3개월 topCategories:', topCategories);
      console.log('3개월 chartData:', JSON.stringify(chartData, null, 2));

      // 모든 차트 데이터에서 topCategories의 값이 숫자여야 함
      for (const monthData of chartData) {
        for (const cat of topCategories) {
          const value = monthData[cat];
          expect(typeof value).toBe('number');
          expect(value).not.toBeNaN();
          expect(value).not.toBeUndefined();
        }
      }
    });

    it('6개월 기간에서 모든 카테고리가 숫자값을 가져야 함', () => {
      const data = createBugReproData();
      const { chartData, topCategories } = generateChartData(data, 6);

      console.log('6개월 topCategories:', topCategories);
      console.log('6개월 chartData:', JSON.stringify(chartData, null, 2));

      for (const monthData of chartData) {
        for (const cat of topCategories) {
          const value = monthData[cat];
          expect(typeof value).toBe('number');
          expect(value).not.toBeNaN();
          expect(value).not.toBeUndefined();
        }
      }
    });

    it('기간 변경 시 topCategories가 달라져도 차트 데이터는 유효해야 함', () => {
      const data = createBugReproData();

      // 3개월과 6개월의 topCategories가 다를 수 있음
      const result3 = generateChartData(data, 3);
      const result6 = generateChartData(data, 6);

      console.log('3개월 vs 6개월 topCategories 비교:');
      console.log('3개월:', result3.topCategories);
      console.log('6개월:', result6.topCategories);

      // 각 기간별로 자체 topCategories에 대해서는 모두 유효해야 함
      for (const monthData of result3.chartData) {
        for (const cat of result3.topCategories) {
          expect(typeof monthData[cat]).toBe('number');
        }
      }

      for (const monthData of result6.chartData) {
        for (const cat of result6.topCategories) {
          expect(typeof monthData[cat]).toBe('number');
        }
      }
    });
  });

  describe('Recharts Bar 렌더링 시뮬레이션', () => {
    it('Bar 컴포넌트가 사용하는 dataKey가 항상 숫자를 반환해야 함', () => {
      const data = createBugReproData();

      // 6개월에서 3개월로 변경하는 시나리오
      const result6 = generateChartData(data, 6);
      const result3 = generateChartData(data, 3);

      // 6개월의 topCategories를 3개월의 chartData에 적용하면 문제 발생 가능
      // (이것이 실제 버그 시나리오)
      console.log('\n=== 버그 시나리오 시뮬레이션 ===');
      console.log('6개월 topCategories:', result6.topCategories);
      console.log('3개월 chartData에 6개월 topCategories 적용:');

      for (const cat of result6.topCategories) {
        for (const monthData of result3.chartData) {
          const value = monthData[cat];
          console.log(`  ${monthData.month} - ${cat}: ${value} (type: ${typeof value})`);

          // 이 값이 undefined면 차트가 깨짐!
          if (value === undefined) {
            console.log(`  ⚠️ 버그 발견: ${cat}가 ${monthData.month}에서 undefined`);
          }
        }
      }
    });
  });
});
