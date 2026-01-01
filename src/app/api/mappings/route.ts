/**
 * /api/mappings
 * 카테고리 및 이용처명 매핑 관리 API
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  fetchAllMappings,
  saveCategoryMapping,
  updateCategoryMappingWithHistory,
  updateMerchantMappingWithHistory,
  deleteMappingByType,
} from '@/lib/services/mappings.service';
import { isValidCategory } from '@/lib/utils/validation';
import type { Category } from '@/types';

/**
 * GET /api/mappings
 * 모든 매핑 조회
 */
export async function GET(): Promise<NextResponse> {
  try {
    const result = await fetchAllMappings();

    if (result.error || !result.data) {
      return NextResponse.json(
        { success: false, error: result.error || '매핑 조회 실패' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        categoryMappings: result.data.categoryMappings,
        merchantMappings: result.data.merchantMappings,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: `서버 오류: ${String(err)}` },
      { status: 500 }
    );
  }
}

interface SaveMappingRequest {
  merchantName: string;
  category: Category;
}

/**
 * POST /api/mappings
 * 수동 카테고리 매핑 저장
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: SaveMappingRequest = await request.json();
    const { merchantName, category } = body;

    if (!merchantName || !category) {
      return NextResponse.json(
        { success: false, error: 'merchantName과 category가 필요합니다.' },
        { status: 400 }
      );
    }

    if (!isValidCategory(category)) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 카테고리입니다.' },
        { status: 400 }
      );
    }

    await saveCategoryMapping(merchantName, category);

    return NextResponse.json({
      success: true,
      message: '매핑이 저장되었습니다.',
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: `서버 오류: ${String(err)}` },
      { status: 500 }
    );
  }
}

interface UpdateMappingRequest {
  type: 'category' | 'merchant';
  id: string;
  // 카테고리 매핑 업데이트
  category?: Category;
  // 이용처명 매핑 업데이트
  preferredName?: string;
}

/**
 * PATCH /api/mappings
 * 매핑 수정
 */
export async function PATCH(request: NextRequest): Promise<NextResponse> {
  try {
    const body: UpdateMappingRequest = await request.json();
    const { type, id, category, preferredName } = body;

    if (!type || !id) {
      return NextResponse.json(
        { success: false, error: 'type과 id가 필요합니다.' },
        { status: 400 }
      );
    }

    if (type === 'category') {
      if (!category || !isValidCategory(category)) {
        return NextResponse.json(
          { success: false, error: '유효한 category가 필요합니다.' },
          { status: 400 }
        );
      }

      const updateResult = await updateCategoryMappingWithHistory(id, category);
      if (updateResult.error) {
        return NextResponse.json(
          { success: false, error: updateResult.error },
          { status: 500 }
        );
      }
    } else if (type === 'merchant') {
      if (!preferredName) {
        return NextResponse.json(
          { success: false, error: 'preferredName이 필요합니다.' },
          { status: 400 }
        );
      }

      const updateResult = await updateMerchantMappingWithHistory(id, preferredName);
      if (updateResult.error) {
        return NextResponse.json(
          { success: false, error: updateResult.error },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: '매핑이 수정되었습니다.',
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: `서버 오류: ${String(err)}` },
      { status: 500 }
    );
  }
}

interface DeleteMappingRequest {
  type: 'category' | 'merchant';
  id: string;
}

/**
 * DELETE /api/mappings
 * 매핑 삭제
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as 'category' | 'merchant' | null;
    const id = searchParams.get('id');

    if (!type || !id) {
      return NextResponse.json(
        { success: false, error: 'type과 id가 필요합니다.' },
        { status: 400 }
      );
    }

    const result = await deleteMappingByType(type, id);
    if (result.error) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '매핑이 삭제되었습니다.',
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: `서버 오류: ${String(err)}` },
      { status: 500 }
    );
  }
}
