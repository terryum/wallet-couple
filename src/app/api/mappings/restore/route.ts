/**
 * /api/mappings/restore
 * 매핑 복구 API
 */

import { NextRequest, NextResponse } from 'next/server';
import { restoreMappingFromHistory } from '@/lib/services/mappings.service';

interface RestoreRequest {
  historyId: string;
}

/**
 * POST /api/mappings/restore
 * 히스토리에서 이전 상태로 복구
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: RestoreRequest = await request.json();
    const { historyId } = body;

    if (!historyId) {
      return NextResponse.json(
        { success: false, error: 'historyId가 필요합니다.' },
        { status: 400 }
      );
    }

    const result = await restoreMappingFromHistory(historyId);
    if (result.error) {
      const status = result.error.includes('찾을 수 없습니다') ? 404 : 400;
      return NextResponse.json(
        { success: false, error: result.error },
        { status }
      );
    }

    return NextResponse.json({
      success: true,
      message: '매핑이 복구되었습니다.',
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: `서버 오류: ${String(err)}` },
      { status: 500 }
    );
  }
}
