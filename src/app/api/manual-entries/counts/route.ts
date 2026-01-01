/**
 * GET /api/manual-entries/counts
 * 직접입력 내역 수 조회 (남편/아내별)
 */

import { NextResponse } from 'next/server';
import { getManualEntryCount } from '@/lib/repositories/manual-entries.repo';

export async function GET(): Promise<NextResponse> {
  try {
    const [husbandResult, wifeResult] = await Promise.all([
      getManualEntryCount('husband'),
      getManualEntryCount('wife'),
    ]);

    if (husbandResult.error || wifeResult.error) {
      return NextResponse.json(
        { success: false, error: husbandResult.error || wifeResult.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        husband: husbandResult.data || 0,
        wife: wifeResult.data || 0,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: `서버 오류: ${String(err)}` },
      { status: 500 }
    );
  }
}
