/**
 * /api/mappings/history
 * 매핑 관련 히스토리 조회 API
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

/**
 * GET /api/mappings/history
 * 특정 매핑의 히스토리 조회 (매핑 변경 히스토리 + 영향받은 트랜잭션 히스토리)
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

    // 1. 매핑 자체의 변경 히스토리 조회
    const { data: mappingHistory, error: mappingError } = await supabase
      .from('action_history')
      .select('*')
      .eq('entity_type', 'mapping')
      .eq('entity_id', mappingId)
      .order('created_at', { ascending: false });

    if (mappingError) {
      return NextResponse.json(
        { success: false, error: mappingError.message },
        { status: 500 }
      );
    }

    // 2. 이 매핑으로 인해 영향받은 트랜잭션 히스토리 조회
    const { data: transactionHistory, error: txError } = await supabase
      .from('action_history')
      .select('*')
      .eq('action_type', 'mapping_apply')
      .eq('mapping_id', mappingId)
      .order('created_at', { ascending: false });

    if (txError) {
      console.error('트랜잭션 히스토리 조회 오류:', txError.message);
    }

    // 3. 두 히스토리 합치기 (최신순 정렬)
    const allHistory = [
      ...(mappingHistory || []),
      ...(transactionHistory || []),
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json({
      success: true,
      data: allHistory,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: `서버 오류: ${String(err)}` },
      { status: 500 }
    );
  }
}
