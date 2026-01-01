/**
 * 전체 초기화 API
 * DELETE /api/reset - 모든 데이터를 초기 상태로 복원
 *
 * Query params:
 * - preserveCustomizations: 'true' | 'false' (default: 'false')
 *   사용자 커스텀 설정 유지 여부 (카테고리 매핑, 이용처명 매핑 등)
 *
 * 하위 호환성을 위해 preserveMappings 파라미터도 지원합니다.
 */

import { NextResponse } from 'next/server';
import { resetAllData } from '@/lib/supabase/queries';

export async function DELETE(request: Request): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);

    // 새로운 파라미터명 우선, 하위 호환성을 위해 기존 파라미터도 지원
    const preserveCustomizations =
      searchParams.get('preserveCustomizations') === 'true' ||
      searchParams.get('preserveMappings') === 'true';

    const result = await resetAllData(preserveCustomizations);

    if (result.error) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `모든 데이터가 초기화되었습니다.${preserveCustomizations ? ' (사용자 설정 유지)' : ''}`,
      deleted: result.data?.deleted,
      preservedCustomizations: preserveCustomizations,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: String(err) },
      { status: 500 }
    );
  }
}
