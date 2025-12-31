/**
 * AI 카테고리 분류 서비스
 * Claude API를 사용하여 거래 내역을 자동으로 분류
 * 캐시된 매핑을 우선 사용하고, 새 이용처만 AI 분류
 */

import Anthropic from '@anthropic-ai/sdk';
import { supabase } from '@/lib/supabase/client';
import { CATEGORY_SET_A, INCOME_CATEGORIES, type Category, type CategoryA, type IncomeCategory } from '@/types';

/** 분류 대상 거래 */
export interface ClassifyInput {
  index: number;
  merchant: string;
  amount: number;
}

/** 분류 결과 */
export interface ClassifyResult {
  index: number;
  category: Category;
}

/** 카테고리 매핑 */
interface CategoryMapping {
  id: string;
  pattern: string;
  category: Category;
  source: 'ai' | 'manual';
  match_count: number;
}

/** 배치 크기 (한 번에 분류할 거래 수) */
const BATCH_SIZE = 50;

/** 지출 카테고리 설명 */
const CATEGORY_DESCRIPTIONS: Record<CategoryA, string> = {
  '식료품': '마트, 슈퍼, 편의점에서 구매한 식재료, 생필품',
  '외식/커피': '음식점, 카페, 배달음식, 커피, 음료',
  '쇼핑': '의류, 잡화, 온라인쇼핑, 백화점',
  '관리비': '아파트 관리비, 공과금, 가스비, 전기요금',
  '통신/교통': '휴대폰요금, 인터넷, 교통비, 주유, 주차, 택시, 기차, SRT, KTX',
  '육아': '어린이집, 유치원, 학원, 아이용품, 장난감, 아이 병원비',
  '병원/미용': '병원, 약국, 의료비, 미용실, 피부관리, 네일, 화장품',
  '기존할부': '할부 결제 (자동차, 가전제품 등)',
  '대출이자': '대출이자, 카드이자, 금융비용, 토스뱅크 이자',
  '양육비': '양육비 이체, 양육 관련 고정 지출',
  '세금': '국세, 지방세, 자동차세, 재산세, 주민세, 경찰청, 교통범칙금',
};

/** 소득 카테고리 설명 */
const INCOME_CATEGORY_DESCRIPTIONS: Record<IncomeCategory, string> = {
  '급여': '월급, 정기 급여, 회사에서 받는 급여',
  '상여': '보너스, 인센티브, 추석/명절 상여금',
  '정부/환급': '정부 지원금, 세금 환급, 연말정산 환급, 육아수당',
  '강연/도서': '강연료, 원고료, 인세, 컨설팅비, 부업 수입',
  '금융소득': '이자, 배당금, 투자 수익, 예금 이자',
  '기타소득': '중고 판매, 경품, 기타 수입',
};

/**
 * 이용처명에서 패턴 추출
 * 숫자, 지점명, 특수문자 등을 제거하여 핵심 키워드만 추출
 */
export function extractPattern(merchantName: string): string {
  let pattern = merchantName;

  // 숫자 제거 (전화번호, 지점번호 등)
  pattern = pattern.replace(/\d+/g, '');

  // 일반적인 지점명/접미사 패턴 제거
  const suffixes = [
    '점$', '호점$', '지점$', '본점$', '직영점$', '가맹점$',
    '역점$', '역사점$', '타워점$', '센터점$',
    '몰점$', '마트점$', '백화점$', '아울렛$',
    '강남$', '홍대$', '신촌$', '잠실$', '판교$', '분당$',
    '서울$', '부산$', '대구$', '인천$', '광주$', '대전$',
  ];

  for (const suffix of suffixes) {
    pattern = pattern.replace(new RegExp(suffix), '');
  }

  // 괄호 안의 내용 제거 (주식회사 표시 등)
  pattern = pattern.replace(/\([^)]*\)/g, '');
  pattern = pattern.replace(/\[[^\]]*\]/g, '');

  // (주), 주식회사 등 제거
  pattern = pattern.replace(/^\(주\)/g, '');
  pattern = pattern.replace(/^주식회사/g, '');
  pattern = pattern.replace(/^㈜/g, '');

  // 특수문자 및 공백 정리
  pattern = pattern.replace(/[-_/\\.,]/g, ' ').trim();
  pattern = pattern.replace(/\s+/g, ' ');

  // 최소 2글자 이상
  if (pattern.length < 2) {
    return merchantName.slice(0, 4);
  }

  return pattern.trim();
}

/**
 * 캐시된 매핑에서 카테고리 조회
 * similarity 함수를 사용하여 유사한 패턴 매칭
 */
async function lookupCachedMappings(
  patterns: string[]
): Promise<Map<string, CategoryMapping>> {
  const mappingMap = new Map<string, CategoryMapping>();

  if (patterns.length === 0) return mappingMap;

  // 각 패턴에 대해 유사도 검색
  for (const pattern of patterns) {
    try {
      // 1. 정확히 일치하는 패턴 찾기
      const { data: exactMatch } = await supabase
        .from('category_mappings')
        .select('*')
        .eq('pattern', pattern)
        .single();

      if (exactMatch) {
        mappingMap.set(pattern, exactMatch as CategoryMapping);
        continue;
      }

      // 2. 패턴이 포함된 매핑 찾기 (예: "택시" 패턴이 있으면 "택시 부산바" 매칭)
      const { data: containsMatch } = await supabase
        .from('category_mappings')
        .select('*')
        .or(`pattern.ilike.%${pattern}%,pattern.ilike.${pattern}%`)
        .order('match_count', { ascending: false })
        .limit(1);

      if (containsMatch && containsMatch.length > 0) {
        mappingMap.set(pattern, containsMatch[0] as CategoryMapping);
        continue;
      }

      // 3. 이 패턴을 포함하는 기존 매핑 찾기 (예: 기존 "스타벅스 강남" 매핑이 있을 때 "스타벅스" 검색)
      const { data: partialMatch } = await supabase
        .from('category_mappings')
        .select('*')
        .ilike('pattern', `${pattern.split(' ')[0]}%`)
        .order('match_count', { ascending: false })
        .limit(1);

      if (partialMatch && partialMatch.length > 0) {
        mappingMap.set(pattern, partialMatch[0] as CategoryMapping);
      }
    } catch (error) {
      console.error(`패턴 조회 실패: ${pattern}`, error);
    }
  }

  return mappingMap;
}

/**
 * 새로운 카테고리 매핑 저장
 */
async function saveMappings(
  mappings: { pattern: string; category: Category; source: 'ai' | 'manual' }[]
): Promise<void> {
  if (mappings.length === 0) return;

  for (const mapping of mappings) {
    try {
      // UPSERT: 있으면 업데이트, 없으면 삽입
      await supabase
        .from('category_mappings')
        .upsert(
          {
            pattern: mapping.pattern,
            category: mapping.category,
            source: mapping.source,
            match_count: 1,
          },
          {
            onConflict: 'pattern',
          }
        );
    } catch (error) {
      console.error(`매핑 저장 실패: ${mapping.pattern}`, error);
    }
  }
}

/**
 * 매핑 사용 횟수 증가
 */
async function incrementMatchCount(patterns: string[]): Promise<void> {
  if (patterns.length === 0) return;

  for (const pattern of patterns) {
    try {
      await supabase.rpc('increment_match_count', { pattern_to_update: pattern });
    } catch {
      // RPC가 없으면 직접 업데이트
      await supabase
        .from('category_mappings')
        .update({ match_count: supabase.rpc('match_count + 1') })
        .eq('pattern', pattern);
    }
  }
}

/**
 * Claude API 클라이언트 생성
 */
function createClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다.');
  }

  return new Anthropic({ apiKey });
}

/**
 * 시스템 프롬프트 생성
 */
function getSystemPrompt(): string {
  const categoryList = Object.entries(CATEGORY_DESCRIPTIONS)
    .map(([cat, desc]) => `- ${cat}: ${desc}`)
    .join('\n');

  return `당신은 한국 가계부 카테고리 분류 전문가입니다.
주어진 가맹점명과 금액을 분석하여 적절한 카테고리로 분류해주세요.

사용 가능한 카테고리:
${categoryList}

규칙:
1. 가맹점명에서 키워드를 분석하여 가장 적합한 카테고리를 선택합니다.
2. 확실하지 않은 경우 '기타'로 분류합니다.
3. 응답은 반드시 JSON 배열 형식으로만 해주세요.
4. 각 항목은 {index: number, category: string} 형식입니다.

예시 응답:
[{"index":0,"category":"외식/커피"},{"index":1,"category":"식료품"}]`;
}

/**
 * 배치 분류 요청 (AI)
 */
async function classifyBatchWithAI(
  client: Anthropic,
  items: ClassifyInput[]
): Promise<ClassifyResult[]> {
  const itemsText = items
    .map((item) => `${item.index}. "${item.merchant}" (${item.amount.toLocaleString()}원)`)
    .join('\n');

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `다음 거래 내역들을 분류해주세요:\n\n${itemsText}`,
      },
    ],
    system: getSystemPrompt(),
  });

  // 응답에서 JSON 추출
  const content = message.content[0];
  if (content.type !== 'text') {
    throw new Error('예상치 못한 응답 형식');
  }

  // JSON 배열 추출 (텍스트에서 [] 사이의 내용)
  const jsonMatch = content.text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    console.error('JSON 파싱 실패:', content.text);
    // 파싱 실패 시 모두 기타로 분류
    return items.map((item) => ({
      index: item.index,
      category: '기타' as Category,
    }));
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]) as { index: number; category: string }[];

    // 유효한 카테고리인지 검증
    return parsed.map((item) => ({
      index: item.index,
      category: CATEGORY_SET_A.includes(item.category as CategoryA)
        ? (item.category as Category)
        : ('기타' as Category),
    }));
  } catch (e) {
    console.error('JSON 파싱 오류:', e);
    return items.map((item) => ({
      index: item.index,
      category: '기타' as Category,
    }));
  }
}

/** 분류 진행 상황 콜백 */
export type ProgressCallback = (current: number, total: number, phase: 'cache' | 'ai') => void;

/**
 * 거래 내역 일괄 분류
 * 1순위: 캐시된 매핑 사용
 * 2순위: AI 분류 (새로운 이용처)
 *
 * @param items 분류할 거래 목록
 * @param onProgress 진행 상황 콜백 (선택적)
 * @param signal AbortSignal (취소용, 선택적)
 * @returns 인덱스별 카테고리 맵
 */
export async function classifyTransactions(
  items: ClassifyInput[],
  onProgress?: ProgressCallback,
  signal?: AbortSignal
): Promise<Map<number, Category>> {
  if (items.length === 0) {
    return new Map();
  }

  const results = new Map<number, Category>();

  // 1. 패턴 추출
  const patternMap = new Map<number, string>(); // index -> pattern
  const patterns: string[] = [];

  for (const item of items) {
    const pattern = extractPattern(item.merchant);
    patternMap.set(item.index, pattern);
    if (!patterns.includes(pattern)) {
      patterns.push(pattern);
    }
  }

  // 2. 캐시된 매핑 조회
  const cachedMappings = await lookupCachedMappings(patterns);

  // 3. 캐시에서 찾은 항목 처리
  const uncachedItems: ClassifyInput[] = [];
  const matchedPatterns: string[] = [];
  let processedCount = 0;
  const totalCount = items.length;

  for (const item of items) {
    // 취소 확인
    if (signal?.aborted) {
      throw new Error('Classification aborted');
    }

    const pattern = patternMap.get(item.index)!;
    const cached = cachedMappings.get(pattern);

    if (cached) {
      results.set(item.index, cached.category as Category);
      matchedPatterns.push(pattern);
      processedCount++;
      onProgress?.(processedCount, totalCount, 'cache');
      console.log(`[캐시 매칭] ${item.merchant} → ${pattern} → ${cached.category}`);
    } else {
      uncachedItems.push(item);
    }
  }

  // 매칭된 패턴의 카운트 증가 (비동기, 결과 대기 안함)
  incrementMatchCount(matchedPatterns).catch(console.error);

  // 4. 캐시에 없는 항목은 AI 분류
  if (uncachedItems.length > 0) {
    console.log(`[AI 분류] ${uncachedItems.length}개 항목 분류 필요`);

    const client = createClient();
    const newMappings: { pattern: string; category: Category; source: 'ai' }[] = [];

    // 배치로 나누어 처리
    for (let i = 0; i < uncachedItems.length; i += BATCH_SIZE) {
      // 취소 확인
      if (signal?.aborted) {
        throw new Error('Classification aborted');
      }

      const batch = uncachedItems.slice(i, i + BATCH_SIZE);

      try {
        const batchResults = await classifyBatchWithAI(client, batch);

        batchResults.forEach((result) => {
          results.set(result.index, result.category);
          processedCount++;
          onProgress?.(processedCount, totalCount, 'ai');

          // 새 매핑 저장 준비
          const pattern = patternMap.get(result.index)!;
          if (!newMappings.find(m => m.pattern === pattern)) {
            newMappings.push({
              pattern,
              category: result.category,
              source: 'ai',
            });
          }
        });
      } catch (error) {
        // 취소된 경우 다시 throw
        if (signal?.aborted) {
          throw new Error('Classification aborted');
        }
        console.error(`배치 ${i / BATCH_SIZE + 1} 분류 실패:`, error);
        // 실패한 배치는 기타로 분류
        batch.forEach((item) => {
          results.set(item.index, '기타');
          processedCount++;
          onProgress?.(processedCount, totalCount, 'ai');
        });
      }
    }

    // 5. 새 매핑 저장 (비동기, 결과 대기 안함)
    if (newMappings.length > 0) {
      console.log(`[매핑 저장] ${newMappings.length}개 새 패턴 저장`);
      saveMappings(newMappings).catch(console.error);
    }
  }

  return results;
}

/**
 * 단일 거래 분류 (테스트용)
 */
export async function classifySingle(
  merchant: string,
  amount: number
): Promise<Category> {
  const results = await classifyTransactions([
    { index: 0, merchant, amount },
  ]);
  return results.get(0) || '기타';
}

/**
 * 소득 카테고리 시스템 프롬프트 생성
 */
function getIncomeSystemPrompt(): string {
  const categoryList = Object.entries(INCOME_CATEGORY_DESCRIPTIONS)
    .map(([cat, desc]) => `- ${cat}: ${desc}`)
    .join('\n');

  return `당신은 한국 가계부 소득 카테고리 분류 전문가입니다.
주어진 입금 내역(이체자명, 적요)과 금액을 분석하여 적절한 소득 카테고리로 분류해주세요.

사용 가능한 소득 카테고리:
${categoryList}

규칙:
1. 입금 내역에서 키워드를 분석하여 가장 적합한 카테고리를 선택합니다.
2. "월급여", "급여" 키워드가 포함되면 "급여"로 분류합니다.
3. "상여", "보너스", "인센티브" 키워드가 포함되면 "상여"로 분류합니다.
4. "환급", "정부", "수당" 키워드가 포함되면 "정부/환급"으로 분류합니다.
5. 회사명이나 기관명이 보이고 금액이 크면 "강연/도서" (부업 수입)으로 분류합니다.
6. "이자", "배당" 키워드가 포함되면 "금융소득"으로 분류합니다.
7. 확실하지 않은 경우 '기타소득'으로 분류합니다.
8. 응답은 반드시 JSON 배열 형식으로만 해주세요.
9. 각 항목은 {index: number, category: string} 형식입니다.

예시 응답:
[{"index":0,"category":"급여"},{"index":1,"category":"강연/도서"}]`;
}

/**
 * 소득 배치 분류 요청 (AI)
 */
async function classifyIncomeBatchWithAI(
  client: Anthropic,
  items: ClassifyInput[]
): Promise<ClassifyResult[]> {
  const itemsText = items
    .map((item) => `${item.index}. "${item.merchant}" (${item.amount.toLocaleString()}원)`)
    .join('\n');

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `다음 입금 내역들을 소득 카테고리로 분류해주세요:\n\n${itemsText}`,
      },
    ],
    system: getIncomeSystemPrompt(),
  });

  const content = message.content[0];
  if (content.type !== 'text') {
    throw new Error('예상치 못한 응답 형식');
  }

  const jsonMatch = content.text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    console.error('JSON 파싱 실패:', content.text);
    return items.map((item) => ({
      index: item.index,
      category: '기타소득' as Category,
    }));
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]) as { index: number; category: string }[];

    return parsed.map((item) => ({
      index: item.index,
      category: INCOME_CATEGORIES.includes(item.category as IncomeCategory)
        ? (item.category as Category)
        : ('기타소득' as Category),
    }));
  } catch (e) {
    console.error('JSON 파싱 오류:', e);
    return items.map((item) => ({
      index: item.index,
      category: '기타소득' as Category,
    }));
  }
}

/**
 * 소득 거래 내역 일괄 분류
 * 소득 카테고리 전용 AI 분류
 *
 * @param items 분류할 소득 거래 목록
 * @param onProgress 진행 상황 콜백 (선택적)
 * @param signal AbortSignal (취소용, 선택적)
 * @returns 인덱스별 카테고리 맵
 */
export async function classifyIncomeTransactions(
  items: ClassifyInput[],
  onProgress?: ProgressCallback,
  signal?: AbortSignal
): Promise<Map<number, Category>> {
  if (items.length === 0) {
    return new Map();
  }

  const results = new Map<number, Category>();
  const client = createClient();
  let processedCount = 0;
  const totalCount = items.length;

  // 배치로 나누어 처리
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    if (signal?.aborted) {
      throw new Error('Classification aborted');
    }

    const batch = items.slice(i, i + BATCH_SIZE);

    try {
      const batchResults = await classifyIncomeBatchWithAI(client, batch);

      batchResults.forEach((result) => {
        results.set(result.index, result.category);
        processedCount++;
        onProgress?.(processedCount, totalCount, 'ai');
      });
    } catch (error) {
      if (signal?.aborted) {
        throw new Error('Classification aborted');
      }
      console.error(`소득 배치 ${i / BATCH_SIZE + 1} 분류 실패:`, error);
      batch.forEach((item) => {
        results.set(item.index, '기타소득');
        processedCount++;
        onProgress?.(processedCount, totalCount, 'ai');
      });
    }
  }

  return results;
}

/**
 * 수동 카테고리 변경 시 매핑 저장/업데이트
 * 사용자가 직접 수정한 카테고리는 우선순위가 높음
 */
export async function saveManualMapping(
  merchantName: string,
  category: Category
): Promise<void> {
  const pattern = extractPattern(merchantName);

  console.log(`[수동 매핑] ${merchantName} → ${pattern} → ${category}`);

  try {
    // manual 소스로 저장 (AI보다 우선)
    await supabase
      .from('category_mappings')
      .upsert(
        {
          pattern,
          category,
          source: 'manual',
          match_count: 1,
        },
        {
          onConflict: 'pattern',
        }
      );
  } catch (error) {
    console.error('수동 매핑 저장 실패:', error);
    throw error;
  }
}

/** 이용처명 매핑 */
interface MerchantNameMapping {
  original_pattern: string;
  preferred_name: string;
  match_count: number;
}

/**
 * 이용처명 매핑 일괄 조회
 * 패턴별로 사용자가 선호하는 이름이 있는지 확인
 */
export async function lookupMerchantNameMappings(
  merchantNames: string[]
): Promise<Map<string, string>> {
  const mappingMap = new Map<string, string>(); // original merchant -> preferred name

  if (merchantNames.length === 0) return mappingMap;

  // 각 이용처명의 패턴 추출
  const patternToOriginal = new Map<string, string[]>(); // pattern -> [original names]
  for (const name of merchantNames) {
    const pattern = extractPattern(name);
    const existing = patternToOriginal.get(pattern) || [];
    existing.push(name);
    patternToOriginal.set(pattern, existing);
  }

  const patterns = Array.from(patternToOriginal.keys());

  // 패턴별로 매핑 조회
  try {
    const { data: mappings } = await supabase
      .from('merchant_name_mappings')
      .select('original_pattern, preferred_name, match_count')
      .in('original_pattern', patterns);

    if (mappings && mappings.length > 0) {
      for (const mapping of mappings as MerchantNameMapping[]) {
        const originalNames = patternToOriginal.get(mapping.original_pattern) || [];
        for (const originalName of originalNames) {
          mappingMap.set(originalName, mapping.preferred_name);
          console.log(`[이용처 매핑] ${originalName} → ${mapping.preferred_name}`);
        }
      }
    }
  } catch (error) {
    console.error('이용처명 매핑 조회 실패:', error);
  }

  return mappingMap;
}

/**
 * 거래 목록에 이용처명 매핑 적용
 * 사용자가 수정한 이용처명으로 자동 변환
 */
export async function applyMerchantNameMappings<T extends { merchant: string }>(
  items: T[]
): Promise<T[]> {
  if (items.length === 0) return items;

  const merchantNames = items.map(item => item.merchant);
  const mappings = await lookupMerchantNameMappings(merchantNames);

  if (mappings.size === 0) return items;

  return items.map(item => {
    const preferredName = mappings.get(item.merchant);
    if (preferredName) {
      return { ...item, merchant: preferredName };
    }
    return item;
  });
}
