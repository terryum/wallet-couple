/**
 * 사용자 커스텀 설정 서비스
 *
 * 커스텀 설정의 조회, 삭제 등을 처리합니다.
 */

import { supabase } from '@/lib/supabase/client';
import { CUSTOMIZATION_CONFIGS, type CustomizationConfig } from './registry';

/** 각 커스텀 설정의 개수 정보 */
export interface CustomizationCounts {
  [tableName: string]: number;
}

/** 삭제 결과 */
export interface DeleteCustomizationsResult {
  success: boolean;
  deleted: CustomizationCounts;
  errors: string[];
}

/**
 * 모든 커스텀 설정의 개수 조회
 */
export async function getCustomizationCounts(): Promise<CustomizationCounts> {
  const counts: CustomizationCounts = {};

  for (const config of CUSTOMIZATION_CONFIGS) {
    try {
      const { count } = await supabase
        .from(config.tableName)
        .select('*', { count: 'exact', head: true });

      counts[config.tableName] = count || 0;
    } catch {
      counts[config.tableName] = 0;
    }
  }

  return counts;
}

/**
 * 모든 커스텀 설정의 총 개수
 */
export async function getTotalCustomizationCount(): Promise<number> {
  const counts = await getCustomizationCounts();
  return Object.values(counts).reduce((sum, count) => sum + count, 0);
}

/**
 * 특정 커스텀 설정 테이블 삭제
 */
async function deleteCustomizationTable(
  config: CustomizationConfig
): Promise<{ count: number; error: string | null }> {
  try {
    // 먼저 개수 확인
    const { count: beforeCount } = await supabase
      .from(config.tableName)
      .select('*', { count: 'exact', head: true });

    // 삭제 실행 - 모든 테이블에서 neq 사용 (표준화)
    const { error } = await supabase
      .from(config.tableName)
      .delete()
      .neq(config.deleteFilter.column, config.deleteFilter.value);

    if (error) {
      return { count: 0, error: `${config.displayName} 삭제 실패: ${error.message}` };
    }

    return { count: beforeCount || 0, error: null };
  } catch (err) {
    return { count: 0, error: `${config.displayName} 삭제 중 오류: ${String(err)}` };
  }
}

/**
 * 모든 커스텀 설정 삭제
 *
 * 레지스트리에 등록된 모든 커스텀 설정을 삭제합니다.
 * 새로운 커스텀 기능이 추가되어도 registry.ts에만 등록하면 자동으로 처리됩니다.
 */
export async function deleteAllCustomizations(): Promise<DeleteCustomizationsResult> {
  const deleted: CustomizationCounts = {};
  const errors: string[] = [];

  for (const config of CUSTOMIZATION_CONFIGS) {
    const result = await deleteCustomizationTable(config);
    deleted[config.tableName] = result.count;

    if (result.error) {
      errors.push(result.error);
    }
  }

  return {
    success: errors.length === 0,
    deleted,
    errors,
  };
}

/**
 * 커스텀 설정 존재 여부 확인
 */
export async function hasAnyCustomizations(): Promise<boolean> {
  const total = await getTotalCustomizationCount();
  return total > 0;
}
