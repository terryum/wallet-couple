/**
 * POST /api/classify
 * 기존 거래 내역 재분류 API
 */

import { NextRequest, NextResponse } from 'next/server';
import { classifyTransactions, type ClassifyInput } from '@/lib/classifier';
import { supabase } from '@/lib/supabase/client';
import type { Transaction, Category } from '@/types';

interface ClassifyRequest {
  month?: string; // YYYY-MM 형식, 없으면 전체
  owner?: 'husband' | 'wife';
}

interface ClassifyResponse {
  success: boolean;
  message: string;
  classified: number;
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: ClassifyRequest = await request.json();
    const { month, owner } = body;

    // 분류 대상 거래 조회 (기존할부 제외)
    // category가 '기존할부'이거나 raw_data에 is_installment가 true인 거래는 제외
    let query = supabase
      .from('transactions')
      .select('id, merchant_name, amount, category, raw_data')
      .eq('is_deleted', false)
      .neq('category', '기존할부');  // 기존할부는 재분류 대상에서 제외

    if (month) {
      const startDate = `${month}-01`;
      const [year, monthNum] = month.split('-').map(Number);
      const nextMonth = new Date(year, monthNum, 1);
      const endDate = nextMonth.toISOString().split('T')[0];
      query = query.gte('transaction_date', startDate).lt('transaction_date', endDate);
    }

    if (owner) {
      query = query.eq('owner', owner);
    }

    const { data: transactions, error: fetchError } = await query;

    if (fetchError) {
      return NextResponse.json(
        { success: false, message: '거래 조회 실패', error: fetchError.message },
        { status: 500 }
      );
    }

    if (!transactions || transactions.length === 0) {
      return NextResponse.json({
        success: true,
        message: '분류할 거래가 없습니다.',
        classified: 0,
      });
    }

    // is_installment가 true인 거래는 필터링 (기존할부로 복구)
    interface TransactionWithRaw {
      id: string;
      merchant_name: string;
      amount: number;
      category: Category;
      raw_data?: { original?: { is_installment?: boolean } };
    }

    const installmentTxs: TransactionWithRaw[] = [];
    const classifiableTxs: TransactionWithRaw[] = [];

    for (const tx of transactions as TransactionWithRaw[]) {
      const isInstallment = tx.raw_data?.original?.is_installment === true;
      if (isInstallment) {
        installmentTxs.push(tx);
      } else {
        classifiableTxs.push(tx);
      }
    }

    // 할부 거래는 '기존할부'로 복구
    for (const tx of installmentTxs) {
      if (tx.category !== '기존할부') {
        await supabase
          .from('transactions')
          .update({ category: '기존할부' })
          .eq('id', tx.id);
      }
    }

    // AI 분류 실행 (할부가 아닌 거래만)
    const classifyInputs: ClassifyInput[] = classifiableTxs.map((tx, idx) => ({
      index: idx,
      merchant: tx.merchant_name,
      amount: tx.amount,
    }));

    const categoryMap = await classifyTransactions(classifyInputs);

    // 분류 결과 업데이트
    let updateCount = 0;
    for (let i = 0; i < classifiableTxs.length; i++) {
      const tx = classifiableTxs[i];
      const newCategory = categoryMap.get(i);

      if (newCategory && newCategory !== tx.category) {
        const { error: updateError } = await supabase
          .from('transactions')
          .update({ category: newCategory })
          .eq('id', tx.id);

        if (!updateError) {
          updateCount++;
        }
      }
    }

    // 할부 복구 건수도 포함
    const restoredCount = installmentTxs.filter(tx => tx.category !== '기존할부').length;

    const response: ClassifyResponse = {
      success: true,
      message: `${classifiableTxs.length}건 재분류, ${restoredCount}건 할부 복구 완료`,
      classified: updateCount + restoredCount,
    };

    return NextResponse.json(response);
  } catch (err) {
    return NextResponse.json(
      { success: false, message: `서버 오류: ${String(err)}`, classified: 0 },
      { status: 500 }
    );
  }
}
