/**
 * GET /api/transactions/similar
 * 비슷한 가맹점명을 가진 거래 내역 조회
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import type { Transaction, Category } from '@/types';

interface SimilarResponse {
  success: boolean;
  data: Transaction[];
  pattern: string;
  error?: string;
}

/**
 * 가맹점명에서 핵심 키워드 하나만 추출
 * 첫 번째 의미있는 단어를 반환 (가장 중요한 식별자)
 */
function extractMainKeyword(merchantName: string): string {
  // 원본 가맹점명 정리
  const cleaned = merchantName
    .replace(/\d+/g, '')           // 숫자 제거
    .replace(/[-_()（）\[\]\/]/g, ' ') // 특수문자를 공백으로
    .replace(/\s+/g, ' ')          // 다중 공백 정리
    .trim();

  // 공백으로 분리된 모든 단어 (2글자 이상)
  const words = cleaned.split(/\s+/).filter(w => w.length >= 2);

  // 불용어 목록 (지역명, 회사 접미사, 결제 용어 등)
  const stopWords = [
    '주식회사', '유한회사', '한국', '대한', '코리아',
    '한국정보통신', '정보통신', '결제', '페이', '카드',
    '온라인', '오프라인', '전자', '상사',
    // 지역명 (너무 많은 매칭 방지)
    '서울', '부산', '대전', '대구', '인천', '광주', '울산', '세종',
    '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'
  ];

  // 첫 번째 의미있는 단어 찾기
  for (const word of words) {
    if (!stopWords.includes(word)) {
      return word;
    }
  }

  // 모든 단어가 불용어면 첫 번째 단어 반환
  return words[0] || merchantName.slice(0, 4);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const merchantName = searchParams.get('merchant');
    const excludeId = searchParams.get('exclude_id');
    const currentCategory = searchParams.get('current_category') as Category | null;

    if (!merchantName) {
      return NextResponse.json(
        { success: false, error: 'merchant 파라미터가 필요합니다.' },
        { status: 400 }
      );
    }

    // 핵심 키워드 추출 (단일)
    const keyword = extractMainKeyword(merchantName);

    if (!keyword || keyword.length < 2) {
      return NextResponse.json({
        success: true,
        data: [],
        pattern: keyword,
      });
    }

    // 단일 키워드로 ILIKE 검색 (정확한 매칭)
    let query = supabase
      .from('transactions')
      .select('*')
      .eq('is_deleted', false)
      .ilike('merchant_name', `%${keyword}%`);

    // 현재 거래 제외
    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    // 현재 카테고리와 같은 것만 (변경 대상)
    if (currentCategory) {
      query = query.eq('category', currentCategory);
    }

    const { data, error } = await query
      .order('transaction_date', { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    const response: SimilarResponse = {
      success: true,
      data: data || [],
      pattern: keyword,
    };

    return NextResponse.json(response);
  } catch (err) {
    return NextResponse.json(
      { success: false, error: String(err) },
      { status: 500 }
    );
  }
}
