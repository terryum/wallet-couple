/**
 * GET /api/files/[id]/download
 * 파일 다운로드 API
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUploadedFileById } from '@/lib/supabase/queries';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { success: false, message: '파일 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    const result = await getUploadedFileById(id);

    if (result.error || !result.data) {
      return NextResponse.json(
        { success: false, message: result.error || '파일을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const file = result.data;

    if (!file.file_content) {
      return NextResponse.json(
        { success: false, message: '파일 내용이 없습니다.' },
        { status: 404 }
      );
    }

    // Base64를 바이너리로 변환
    const buffer = Buffer.from(file.file_content, 'base64');

    // 파일명에서 확장자 추출
    const extension = file.original_filename.split('.').pop() || 'xls';
    const contentType = extension === 'xlsx'
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : 'application/vnd.ms-excel';

    // 다운로드할 파일명 (display_name 사용)
    const downloadFilename = encodeURIComponent(file.display_name);

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${downloadFilename}"`,
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: `서버 오류: ${String(err)}` },
      { status: 500 }
    );
  }
}
