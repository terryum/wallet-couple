/**
 * 사용자 커스텀 설정 레지스트리
 *
 * 앱에서 사용자가 커스터마이징할 수 있는 모든 설정을 중앙에서 관리합니다.
 * 새로운 커스텀 기능을 추가할 때 이 파일에 등록하면 초기화 시 자동으로 포함됩니다.
 *
 * 등록 방법:
 * 1. CUSTOMIZATION_CONFIGS에 새 항목 추가
 * 2. CustomizationType에 타입 추가
 * 3. 해당 테이블이 Supabase에 존재하는지 확인
 */

/** 커스텀 설정 종류 */
export type CustomizationType =
  | 'category_mapping'      // 카테고리 매핑 (이용처 → 카테고리)
  | 'merchant_name_mapping' // 이용처명 매핑 (원본명 → 선호명)
  // 향후 추가 예정:
  // | 'custom_category'    // 사용자 정의 카테고리
  // | 'parsing_rule'       // 통장 내역 파싱 룰
  // | 'budget_setting'     // 예산 설정
  ;

/** 커스텀 설정 구성 정보 */
export interface CustomizationConfig {
  /** 고유 식별자 */
  type: CustomizationType;
  /** Supabase 테이블명 */
  tableName: string;
  /** 표시 이름 (한글) */
  displayName: string;
  /** 설명 */
  description: string;
  /** 삭제 시 사용할 필터 컬럼 (neq 사용) */
  deleteFilter: {
    column: string;
    value: string;
  };
}

/**
 * 등록된 모든 커스텀 설정
 *
 * 새로운 커스텀 기능을 추가할 때 여기에 등록하세요.
 * 초기화 로직에서 자동으로 처리됩니다.
 */
export const CUSTOMIZATION_CONFIGS: readonly CustomizationConfig[] = [
  {
    type: 'category_mapping',
    tableName: 'category_mappings',
    displayName: '카테고리 매핑',
    description: '이용처별 자동 카테고리 분류 설정',
    deleteFilter: {
      column: 'id',
      value: '00000000-0000-0000-0000-000000000000',
    },
  },
  {
    type: 'merchant_name_mapping',
    tableName: 'merchant_name_mappings',
    displayName: '이용처명 매핑',
    description: '이용처명 자동 변환 설정',
    deleteFilter: {
      column: 'id',
      value: '00000000-0000-0000-0000-000000000000',
    },
  },
  // ┌──────────────────────────────────────────────────────────┐
  // │ 새로운 커스텀 기능을 추가할 때 여기에 등록하세요.           │
  // │ 초기화 로직에서 자동으로 처리됩니다.                        │
  // │                                                          │
  // │ 예시:                                                     │
  // │ {                                                         │
  // │   type: 'custom_category',                                │
  // │   tableName: 'custom_categories',                         │
  // │   displayName: '사용자 정의 카테고리',                      │
  // │   description: '사용자가 추가한 카테고리',                  │
  // │   deleteFilter: { column: 'id', value: '00000...' },      │
  // │ },                                                        │
  // └──────────────────────────────────────────────────────────┘
] as const;

/** 모든 커스텀 설정 테이블명 목록 */
export const CUSTOMIZATION_TABLE_NAMES = CUSTOMIZATION_CONFIGS.map(
  (config) => config.tableName
);

/** 특정 타입의 설정 정보 조회 */
export function getCustomizationConfig(
  type: CustomizationType
): CustomizationConfig | undefined {
  return CUSTOMIZATION_CONFIGS.find((config) => config.type === type);
}

/** 테이블명으로 설정 정보 조회 */
export function getCustomizationConfigByTable(
  tableName: string
): CustomizationConfig | undefined {
  return CUSTOMIZATION_CONFIGS.find((config) => config.tableName === tableName);
}

/** 커스텀 설정 요약 정보 (UI 표시용) */
export function getCustomizationSummary(): string {
  return CUSTOMIZATION_CONFIGS.map((config) => config.displayName).join(', ');
}
