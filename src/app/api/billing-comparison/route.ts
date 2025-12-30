/**
 * GET /api/billing-comparison
 * 월별 이용금액 vs 청구금액 비교 데이터 조회
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

interface CardBilling {
  source_type: string;
  usage_amount: number;  // 이용금액 (거래 내역 합계)
  billing_amount: number; // 청구금액 (명세서상 합계)
}

interface MonthlyBilling {
  month: string;
  usage_amount: number;
  billing_amount: number;
  cards: CardBilling[];
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const monthCount = parseInt(searchParams.get('months') || '12', 10);

    // 최근 N개월 목록 생성
    const months: string[] = [];
    const now = new Date();
    for (let i = 0; i < monthCount; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      months.push(`${year}-${month}`);
    }

    // 월별 데이터 수집
    const result: MonthlyBilling[] = [];

    for (const month of months) {
      const startDate = `${month}-01`;
      const [year, monthNum] = month.split('-').map(Number);
      const lastDay = new Date(year, monthNum, 0).getDate();
      const endDate = `${month}-${String(lastDay).padStart(2, '0')}`;

      // 1. 해당 월의 거래 내역에서 카드별 이용금액 집계
      const { data: transactions } = await supabase
        .from('transactions')
        .select('source_type, amount')
        .eq('is_deleted', false)
        .gte('transaction_date', startDate)
        .lte('transaction_date', endDate);

      // 카드별 이용금액 집계
      const usageByCard: Record<string, number> = {};
      (transactions || []).forEach(t => {
        usageByCard[t.source_type] = (usageByCard[t.source_type] || 0) + t.amount;
      });

      // 2. 해당 월의 업로드된 파일에서 청구금액 조회
      const { data: files } = await supabase
        .from('uploaded_files')
        .select('source_type, billing_total')
        .eq('billing_month', month);

      // 카드별 청구금액 집계
      const billingByCard: Record<string, number> = {};
      (files || []).forEach(f => {
        if (f.billing_total) {
          billingByCard[f.source_type] = (billingByCard[f.source_type] || 0) + f.billing_total;
        }
      });

      // 3. 모든 카드 타입 수집
      const allCardTypes = new Set([
        ...Object.keys(usageByCard),
        ...Object.keys(billingByCard),
      ]);

      // 4. 카드별 데이터 생성
      const cards: CardBilling[] = [];
      let totalUsage = 0;
      let totalBilling = 0;

      for (const cardType of allCardTypes) {
        const usage = usageByCard[cardType] || 0;
        const billing = billingByCard[cardType] || 0;

        cards.push({
          source_type: cardType,
          usage_amount: usage,
          billing_amount: billing,
        });

        totalUsage += usage;
        totalBilling += billing;
      }

      // 금액이 있는 월만 추가
      if (totalUsage > 0 || totalBilling > 0) {
        result.push({
          month,
          usage_amount: totalUsage,
          billing_amount: totalBilling,
          cards: cards.sort((a, b) => b.usage_amount - a.usage_amount),
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: String(err) },
      { status: 500 }
    );
  }
}
