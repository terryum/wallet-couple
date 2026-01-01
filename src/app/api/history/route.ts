/**
 * GET /api/history
 *
 * 액션 히스토리 조회 API
 */

import { NextRequest, NextResponse } from 'next/server';
import { getActionHistory } from '@/lib/repositories/action-history.repo';

/**
 * GET /api/history
 * 최근 액션 히스토리 조회
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    const result = await getActionHistory(limit);

    if (result.error) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      count: result.data?.length || 0,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: `서버 오류: ${String(err)}` },
      { status: 500 }
    );
  }
}
