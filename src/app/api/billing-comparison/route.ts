/**
 * GET /api/billing-comparison
 * 월별 이용금액 vs 청구금액 비교 데이터 조회
 */

import { NextRequest, NextResponse } from 'next/server';
import { getBillingComparison } from '@/lib/services/billing.service';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const monthCount = parseInt(searchParams.get('months') || '12', 10);

    const result = await getBillingComparison(monthCount);
    if (result.error) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: String(err) },
      { status: 500 }
    );
  }
}
