/**
 * /api/mappings/history
 * 매핑 관련 히스토리 조회 API
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

/**
 * GET /api/mappings/history
 * 특정 매핑의 히스토리 조회
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const mappingId = searchParams.get('mappingId');
    const type = searchParams.get('type') as 'category' | 'merchant' | null;

    if (!mappingId || !type) {
      return NextResponse.json(
        { success: false, error: 'mappingId와 type이 필요합니다.' },
        { status: 400 }
      );
    }

    // action_history에서 해당 매핑 관련 히스토리 조회
    const { data: history, error } = await supabase
      .from('action_history')
      .select('*')
      .eq('entity_type', 'mapping')
      .eq('entity_id', mappingId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: history || [],
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: `서버 오류: ${String(err)}` },
      { status: 500 }
    );
  }
}
