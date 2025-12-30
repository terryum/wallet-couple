/**
 * GET /api/transactions/by-file/[fileId]
 * 특정 파일의 거래 내역 조회
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTransactionsByFileId } from '@/lib/supabase/queries';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
): Promise<NextResponse> {
  try {
    const { fileId } = await params;

    if (!fileId) {
      return NextResponse.json(
        { error: 'fileId가 필요합니다.' },
        { status: 400 }
      );
    }

    const result = await getTransactionsByFileId(fileId);

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: result.data });
  } catch (err) {
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    );
  }
}
