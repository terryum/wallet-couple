/**
 * 개별 파일 관리 API
 * DELETE /api/files/:id - 특정 파일 삭제
 */

import { NextRequest, NextResponse } from 'next/server';
import { removeUploadedFile } from '@/lib/services/files.service';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * 특정 파일 삭제 (관련 거래 내역도 함께 삭제)
 */
export async function DELETE(
  _request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: '파일 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    const result = await removeUploadedFile(id);

    if (result.error) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '파일이 삭제되었습니다.',
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: String(err) },
      { status: 500 }
    );
  }
}
