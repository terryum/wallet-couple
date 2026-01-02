import { supabase } from '@/lib/supabase/client';
import type { Category } from '@/types';

export interface CategoryMapping {
  id: string;
  pattern: string;
  category: Category;
  source: 'ai' | 'manual';
  match_count: number;
  owner: 'husband' | 'wife' | null;
  created_at: string;
}

export interface MerchantNameMapping {
  id: string;
  original_pattern: string;
  preferred_name: string;
  match_count: number;
  owner: 'husband' | 'wife' | null;
  created_at: string;
}

export interface MappingHistory {
  id: string;
  action_type: string;
  entity_type: string;
  entity_id: string | null;
  description: string;
  previous_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  created_at: string;
}

export async function fetchCategoryMappings() {
  const { data, error } = await supabase
    .from('category_mappings')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: (data || []) as CategoryMapping[], error: null };
}

export async function fetchMerchantMappings() {
  const { data, error } = await supabase
    .from('merchant_name_mappings')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: (data || []) as MerchantNameMapping[], error: null };
}

export async function getCategoryMappingById(id: string) {
  const { data, error } = await supabase
    .from('category_mappings')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as CategoryMapping, error: null };
}

export async function getMerchantMappingById(id: string) {
  const { data, error } = await supabase
    .from('merchant_name_mappings')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as MerchantNameMapping, error: null };
}

export async function updateCategoryMapping(id: string, category: Category) {
  const { error } = await supabase
    .from('category_mappings')
    .update({ category, source: 'manual' })
    .eq('id', id);

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: true, error: null };
}

export async function updateMerchantMapping(id: string, preferredName: string) {
  const { error } = await supabase
    .from('merchant_name_mappings')
    .update({ preferred_name: preferredName })
    .eq('id', id);

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: true, error: null };
}

export async function deleteMapping(type: 'category' | 'merchant', id: string) {
  const tableName = type === 'category' ? 'category_mappings' : 'merchant_name_mappings';
  const { error } = await supabase.from(tableName).delete().eq('id', id);

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: true, error: null };
}

export async function createMappingHistory(
  history: Omit<MappingHistory, 'id' | 'created_at'>
) {
  const { error } = await supabase.from('action_history').insert(history);
  if (error) {
    return { data: null, error: error.message };
  }
  return { data: true, error: null };
}

export async function fetchMappingHistory(mappingId: string) {
  const { data, error } = await supabase
    .from('action_history')
    .select('*')
    .eq('entity_type', 'mapping')
    .eq('entity_id', mappingId)
    .order('created_at', { ascending: false });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: (data || []) as MappingHistory[], error: null };
}

export async function getHistoryById(historyId: string) {
  const { data, error } = await supabase
    .from('action_history')
    .select('*')
    .eq('id', historyId)
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as MappingHistory, error: null };
}
