/**
 * POST /api/history/[id]
 *
 * 특정 시점으로 되돌리기 API
 */

import { NextRequest, NextResponse } from 'next/server';
import { undoActionsFromHistory } from '@/lib/repositories/action-history.repo';

/**
 * POST /api/history/[id]
 * 해당 히스토리 시점 이후의 모든 변경을 되돌림
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: '히스토리 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    const result = await undoActionsFromHistory(id);

    if (result.error) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `${result.data?.undone || 0}개의 액션이 되돌려졌습니다.`,
      undone: result.data?.undone || 0,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: `서버 오류: ${String(err)}` },
      { status: 500 }
    );
  }
}
