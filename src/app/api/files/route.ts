/**
 * 파일 관리 API
 * GET /api/files - 업로드된 파일 목록 조회
 * DELETE /api/files - 모든 파일 삭제 (전체 초기화)
 */

import { NextResponse } from 'next/server';
import { getUploadedFiles, deleteAllFiles } from '@/lib/supabase/queries';

/**
 * 업로드된 파일 목록 조회
 */
export async function GET(): Promise<NextResponse> {
  try {
    const result = await getUploadedFiles();

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

/**
 * 모든 파일 삭제 (전체 초기화)
 */
export async function DELETE(request: Request): Promise<NextResponse> {
  try {
    // URL에서 preserveMappings 파라미터 확인
    const { searchParams } = new URL(request.url);
    const preserveMappings = searchParams.get('preserveMappings') === 'true';

    const result = await deleteAllFiles(preserveMappings);

    if (result.error) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `${result.data}개 파일이 삭제되었습니다.${preserveMappings ? ' (이름/카테고리 설정 유지)' : ''}`,
      deletedCount: result.data,
      preservedMappings: preserveMappings,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: String(err) },
      { status: 500 }
    );
  }
}
