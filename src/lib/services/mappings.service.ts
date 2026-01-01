import type { Category } from '@/types';
import {
  fetchCategoryMappings,
  fetchMerchantMappings,
  getCategoryMappingById,
  getMerchantMappingById,
  updateCategoryMapping,
  updateMerchantMapping,
  deleteMapping,
  createMappingHistory,
  fetchMappingHistory,
  getHistoryById,
  type CategoryMapping,
  type MerchantNameMapping,
  type MappingHistory,
} from '@/lib/repositories/mappings.repo';

export interface MappingsResult {
  categoryMappings: CategoryMapping[];
  merchantMappings: MerchantNameMapping[];
}

export async function fetchAllMappings(): Promise<{ data: MappingsResult | null; error: string | null }> {
  const [categories, merchants] = await Promise.all([
    fetchCategoryMappings(),
    fetchMerchantMappings(),
  ]);

  if (categories.error) {
    return { data: null, error: categories.error };
  }
  if (merchants.error) {
    return { data: null, error: merchants.error };
  }

  return {
    data: {
      categoryMappings: categories.data || [],
      merchantMappings: merchants.data || [],
    },
    error: null,
  };
}

export async function saveCategoryMapping(merchantName: string, category: Category) {
  const { saveManualMapping } = await import('@/lib/classifier');
  return saveManualMapping(merchantName, category);
}

export async function updateCategoryMappingWithHistory(
  id: string,
  category: Category
): Promise<{ error: string | null }> {
  const prev = await getCategoryMappingById(id);
  if (prev.error) {
    return { error: prev.error };
  }

  const updateResult = await updateCategoryMapping(id, category);
  if (updateResult.error) {
    return { error: updateResult.error };
  }

  const prevData = prev.data;
  if (prevData && prevData.category !== category) {
    await createMappingHistory({
      action_type: 'update',
      entity_type: 'mapping',
      entity_id: id,
      description: `카테고리 매핑 변경: ${prevData.pattern} (${prevData.category} → ${category})`,
      previous_data: { category: prevData.category, source: prevData.source },
      new_data: { category, source: 'manual' },
    });
  }

  return { error: null };
}

export async function updateMerchantMappingWithHistory(
  id: string,
  preferredName: string
): Promise<{ error: string | null }> {
  const prev = await getMerchantMappingById(id);
  if (prev.error) {
    return { error: prev.error };
  }

  const updateResult = await updateMerchantMapping(id, preferredName);
  if (updateResult.error) {
    return { error: updateResult.error };
  }

  const prevData = prev.data;
  if (prevData && prevData.preferred_name !== preferredName) {
    await createMappingHistory({
      action_type: 'update',
      entity_type: 'mapping',
      entity_id: id,
      description: `이용처명 매핑 변경: ${prevData.original_pattern} (${prevData.preferred_name} → ${preferredName})`,
      previous_data: { preferred_name: prevData.preferred_name },
      new_data: { preferred_name: preferredName },
    });
  }

  return { error: null };
}

export async function deleteMappingByType(
  type: 'category' | 'merchant',
  id: string
): Promise<{ error: string | null }> {
  const result = await deleteMapping(type, id);
  if (result.error) {
    return { error: result.error };
  }
  return { error: null };
}

export async function fetchMappingHistoryById(mappingId: string) {
  return fetchMappingHistory(mappingId);
}

export async function restoreMappingFromHistory(
  historyId: string
): Promise<{ error: string | null }> {
  const historyResult = await getHistoryById(historyId);
  if (historyResult.error || !historyResult.data) {
    return { error: historyResult.error || '히스토리를 찾을 수 없습니다.' };
  }

  const history = historyResult.data as MappingHistory;
  if (!history.previous_data) {
    return { error: '복구할 이전 데이터가 없습니다.' };
  }

  const entityId = history.entity_id;
  const previousData = history.previous_data as Record<string, unknown>;

  if (previousData.category !== undefined) {
    const updateResult = await updateCategoryMapping(entityId || '', previousData.category as Category);
    if (updateResult.error) {
      return { error: updateResult.error };
    }

    await createMappingHistory({
      action_type: 'update',
      entity_type: 'mapping',
      entity_id: entityId,
      description: `카테고리 매핑 복구: ${previousData.category}`,
      previous_data: history.new_data,
      new_data: previousData,
    });
    return { error: null };
  }

  if (previousData.preferred_name !== undefined) {
    const updateResult = await updateMerchantMapping(entityId || '', previousData.preferred_name as string);
    if (updateResult.error) {
      return { error: updateResult.error };
    }

    await createMappingHistory({
      action_type: 'update',
      entity_type: 'mapping',
      entity_id: entityId,
      description: `이용처명 매핑 복구: ${previousData.preferred_name}`,
      previous_data: history.new_data,
      new_data: previousData,
    });
    return { error: null };
  }

  return { error: '알 수 없는 매핑 타입입니다.' };
}
