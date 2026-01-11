/**
 * 가계분석 AI 인사이트 생성 API
 * POST /api/insights/household
 */

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import type { Owner } from '@/types';

interface CategoryAggregation {
  category: string;
  total_amount: number;
  count?: number;
}

interface PieInsightRequest {
  type: 'pie';
  month: string;
  owner?: Owner;
  currentData: {
    incomeTotal: number;
    expenseTotal: number;
    incomeByCategory: CategoryAggregation[];
    expenseByCategory: CategoryAggregation[];
  };
  previousAvg: {
    incomeTotal: number;
    expenseTotal: number;
    incomeByCategory: CategoryAggregation[];
    expenseByCategory: CategoryAggregation[];
  };
}

interface TrendInsightRequest {
  type: 'trend';
  period: string;
  owner?: Owner;
  trendData: Array<{
    month: string;
    income: number;
    expense: number;
    balance: number;
    incomeByCategory: CategoryAggregation[];
    expenseByCategory: CategoryAggregation[];
  }>;
}

type InsightRequest = PieInsightRequest | TrendInsightRequest;

function createClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다.');
  }
  return new Anthropic({ apiKey });
}

function formatAmount(amount: number): string {
  const absAmount = Math.abs(amount);
  if (absAmount >= 10000) {
    return `약 ${Math.round(absAmount / 10000)}만원`;
  }
  return `${absAmount.toLocaleString()}원`;
}

// ============ 도넛차트 인사이트 생성 ============

async function generatePieInsight(
  client: Anthropic,
  data: PieInsightRequest
): Promise<string> {
  const { currentData, previousAvg } = data;

  // 카테고리별 데이터 포맷팅
  const formatCategories = (cats: CategoryAggregation[]) =>
    cats
      .filter((c) => c.total_amount > 0)
      .sort((a, b) => b.total_amount - a.total_amount)
      .slice(0, 7)
      .map((c) => `${c.category} ${formatAmount(c.total_amount)}`)
      .join(', ');

  const incomeDiff = currentData.incomeTotal - previousAvg.incomeTotal;
  const expenseDiff = currentData.expenseTotal - previousAvg.expenseTotal;

  // 고정비 제외한 지출 카테고리
  const FIXED_COSTS = ['양육비', '대출이자', '전세이자', '관리비'];
  const formatExpenseCategories = (cats: CategoryAggregation[]) =>
    cats
      .filter((c) => c.total_amount > 0 && !FIXED_COSTS.includes(c.category))
      .sort((a, b) => b.total_amount - a.total_amount)
      .slice(0, 7)
      .map((c) => `${c.category} ${formatAmount(c.total_amount)}`)
      .join(', ');

  const prompt = `이번 달 가계 소득/지출 데이터를 분석해주세요.

## 이번 달 데이터
- 소득 총액: ${formatAmount(currentData.incomeTotal)}
- 소득 구성: ${formatCategories(currentData.incomeByCategory) || '없음'}
- 지출 총액: ${formatAmount(currentData.expenseTotal)}
- 지출 구성 (고정비 제외): ${formatExpenseCategories(currentData.expenseByCategory) || '없음'}

## 지난 3개월 평균
- 소득 평균: ${formatAmount(previousAvg.incomeTotal)}
- 지출 평균: ${formatAmount(previousAvg.expenseTotal)}
- 주요 지출 카테고리 (고정비 제외): ${formatExpenseCategories(previousAvg.expenseByCategory) || '없음'}

## 변화
- 소득: ${incomeDiff >= 0 ? '+' : ''}${formatAmount(incomeDiff)} (평균 대비)
- 지출: ${expenseDiff >= 0 ? '+' : ''}${formatAmount(expenseDiff)} (평균 대비)

이 데이터를 바탕으로 인사이트를 작성해주세요.`;

  const systemPrompt = `당신은 한국 가정의 가계부 분석 전문가입니다.
월별 소득/지출 데이터를 분석하여 간결하고 실용적인 인사이트를 제공합니다.

규칙:
1. 소득은 최대 1줄로 간단히 특징만 언급합니다 (예: "상여 약 200만원 반영", "강연료 50만원 추가").
2. 지출은 최대 4줄로 자세히 분석합니다.
3. 고정비(양육비, 전세이자, 관리비)는 절대 언급하지 않습니다.
4. 구체적인 금액을 만원 단위로 언급합니다.
5. 지난 3개월 평균과 비교하여 특이사항을 강조합니다.
6. 자연스럽고 친근한 한국어로 작성합니다.
7. 이모지는 사용하지 않습니다.
8. 전체 최대 5줄(소득 1줄 + 지출 4줄)을 넘지 않습니다.

예시 출력:
"상여 약 300만원 반영. 부모님 카테고리 450만원 지출이 크고, 쇼핑은 평소보다 줄었습니다. 외식/커피 지출이 소폭 증가했습니다."
"평소와 비슷한 소득. 육아 지출이 늘어 전체 지출이 약 30만원 증가했습니다. 쇼핑 비중은 줄었습니다."`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 300,
    system: systemPrompt,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = message.content[0];
  if (content.type !== 'text') {
    throw new Error('예상치 못한 응답 형식');
  }

  return content.text.trim();
}

// ============ 추세차트 인사이트 생성 ============

async function generateTrendInsight(
  client: Anthropic,
  data: TrendInsightRequest
): Promise<string> {
  const { period, trendData } = data;

  // 누적 합계 계산
  const totalIncome = trendData.reduce((sum, d) => sum + d.income, 0);
  const totalExpense = trendData.reduce((sum, d) => sum + d.expense, 0);
  const totalBalance = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? Math.round((totalBalance / totalIncome) * 100) : 0;

  // 카테고리별 추세 분석 (지출)
  const categoryTotals = new Map<string, number[]>();
  trendData.forEach((d) => {
    d.expenseByCategory.forEach((c) => {
      if (!categoryTotals.has(c.category)) {
        categoryTotals.set(c.category, []);
      }
      categoryTotals.get(c.category)!.push(c.total_amount);
    });
  });

  // 증가 추세 카테고리 찾기
  const trendingCategories: { category: string; trend: string; total: number }[] = [];
  categoryTotals.forEach((amounts, category) => {
    if (amounts.length < 2) return;
    const firstHalf = amounts.slice(0, Math.floor(amounts.length / 2));
    const secondHalf = amounts.slice(Math.floor(amounts.length / 2));
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    const total = amounts.reduce((a, b) => a + b, 0);

    if (secondAvg > firstAvg * 1.2 && total > 500000) {
      trendingCategories.push({ category, trend: '증가', total });
    } else if (secondAvg < firstAvg * 0.8 && total > 500000) {
      trendingCategories.push({ category, trend: '감소', total });
    }
  });

  // 월별 데이터 포맷팅
  const monthlyData = trendData
    .map((d) => `${d.month}: 소득 ${formatAmount(d.income)}, 지출 ${formatAmount(d.expense)}, 손익 ${d.balance >= 0 ? '+' : ''}${formatAmount(d.balance)}`)
    .join('\n');

  const trendingText = trendingCategories.length > 0
    ? trendingCategories.map((t) => `${t.category} (${t.trend}, 총 ${formatAmount(t.total)})`).join(', ')
    : '뚜렷한 증감 추세 없음';

  const prompt = `최근 ${period}개월 가계 소득/지출 추세를 분석해주세요.

## 월별 데이터
${monthlyData}

## 기간 합계
- 총 소득: ${formatAmount(totalIncome)}
- 총 지출: ${formatAmount(totalExpense)}
- 누적 손익: ${totalBalance >= 0 ? '+' : ''}${formatAmount(totalBalance)} (${totalBalance >= 0 ? '흑자' : '적자'}, 소득 대비 ${savingsRate}%)

## 카테고리별 추세
${trendingText}

이 데이터를 바탕으로 인사이트를 작성해주세요.`;

  const systemPrompt = `당신은 한국 가정의 가계부 분석 전문가입니다.
월별 소득/지출 추세 데이터를 분석하여 간결하고 실용적인 인사이트를 제공합니다.

규칙:
1. 최대 4줄로 간결하게 작성합니다.
2. 기간 내 누적 손익과 소득 대비 손익율(%)을 함께 언급합니다 (예: "3개월간 약 500만원(24%) 흑자").
3. 지출 증가/감소 추세가 있다면 주요 원인 카테고리를 언급합니다.
4. "ㅇㅇ 카테고리를 집중 분석해보세요" 같은 권유 문구는 사용하지 않습니다.
5. 이모지는 사용하지 않습니다.
6. 뚜렷한 추세가 없으면 "전반적으로 안정적인 지출 패턴입니다"라고 표현해도 됩니다.

예시 출력:
"6개월간 약 1,200만원(18%) 흑자를 기록했습니다. 육아 지출이 월평균 80만원으로 지속 증가 추세입니다. 쇼핑은 꾸준히 감소하고 있습니다."
"3개월간 약 200만원(12%) 흑자입니다. 전반적으로 안정적인 지출 패턴이나, 외식/커피 지출이 소폭 증가했습니다."`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 300,
    system: systemPrompt,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = message.content[0];
  if (content.type !== 'text') {
    throw new Error('예상치 못한 응답 형식');
  }

  return content.text.trim();
}

// ============ API 핸들러 ============

export async function POST(request: NextRequest) {
  try {
    const body: InsightRequest = await request.json();

    const client = createClient();

    let insight: string;

    if (body.type === 'pie') {
      insight = await generatePieInsight(client, body);
    } else if (body.type === 'trend') {
      insight = await generateTrendInsight(client, body);
    } else {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 type입니다.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      insight,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('인사이트 생성 실패:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'AI 인사이트 생성에 실패했습니다.',
      },
      { status: 500 }
    );
  }
}
