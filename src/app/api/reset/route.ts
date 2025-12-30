/**
 * 전체 초기화 API
 * DELETE /api/reset - 모든 데이터를 초기 상태로 복원
 */

import { NextResponse } from 'next/server';
import { resetAllData } from '@/lib/supabase/queries';

export async function DELETE(request: Request): Promise<NextResponse> {
  try {
    // URL에서 preserveMappings 파라미터 확인
    const { searchParams } = new URL(request.url);
    const preserveMappings = searchParams.get('preserveMappings') === 'true';

    const result = await resetAllData(preserveMappings);

    if (result.error) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `모든 데이터가 초기화되었습니다.${preserveMappings ? ' (이름/카테고리 설정 유지)' : ''}`,
      deleted: result.data?.deleted,
      preservedMappings: preserveMappings,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: String(err) },
      { status: 500 }
    );
  }
}
