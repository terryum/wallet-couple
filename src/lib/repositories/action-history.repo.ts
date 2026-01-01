import { supabase } from '@/lib/supabase/client';
import type { ActionHistory, CreateActionHistoryDto } from '@/types';
import type { QueryResult } from '@/lib/supabase/queries';

export async function createActionHistory(
  historyData: CreateActionHistoryDto
): Promise<QueryResult<ActionHistory>> {
  try {
    const { data, error } = await supabase
      .from('action_history')
      .insert(historyData)
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as ActionHistory, error: null };
  } catch (err) {
    return { data: null, error: String(err) };
  }
}

export async function getActionHistory(
  limit: number = 10
): Promise<QueryResult<ActionHistory[]>> {
  try {
    const { data, error } = await supabase
      .from('action_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as ActionHistory[], error: null };
  } catch (err) {
    return { data: null, error: String(err) };
  }
}

export async function undoActionsFromHistory(
  historyId: string
): Promise<QueryResult<{ undone: number }>> {
  try {
    const { data: targetHistory, error: targetError } = await supabase
      .from('action_history')
      .select('*')
      .eq('id', historyId)
      .single();

    if (targetError || !targetHistory) {
      return { data: null, error: '히스토리를 찾을 수 없습니다.' };
    }

    const { data: histories, error: historyError } = await supabase
      .from('action_history')
      .select('*')
      .gte('created_at', targetHistory.created_at)
      .order('created_at', { ascending: false });

    if (historyError || !histories) {
      return { data: null, error: '히스토리 조회 실패' };
    }

    let undone = 0;

    for (const history of histories) {
      const success = await undoSingleAction(history as ActionHistory);
      if (success) undone++;
    }

    await supabase
      .from('action_history')
      .delete()
      .gte('created_at', targetHistory.created_at);

    return { data: { undone }, error: null };
  } catch (err) {
    return { data: null, error: String(err) };
  }
}

async function undoSingleAction(history: ActionHistory): Promise<boolean> {
  try {
    switch (history.action_type) {
      case 'create': {
        if (history.entity_type === 'transaction' && history.entity_id) {
          await supabase
            .from('transactions')
            .delete()
            .eq('id', history.entity_id);
        } else if (history.entity_type === 'file' && history.entity_id) {
          await supabase
            .from('uploaded_files')
            .delete()
            .eq('id', history.entity_id);
        }
        return true;
      }

      case 'update': {
        if (history.entity_type === 'transaction' && history.entity_id && history.previous_data) {
          await supabase
            .from('transactions')
            .update(history.previous_data)
            .eq('id', history.entity_id);
        }
        return true;
      }

      case 'delete': {
        if (history.entity_type === 'transaction' && history.entity_id) {
          await supabase
            .from('transactions')
            .update({ is_deleted: false })
            .eq('id', history.entity_id);
        }
        return true;
      }

      case 'upload': {
        if (history.entity_id) {
          await supabase
            .from('uploaded_files')
            .delete()
            .eq('id', history.entity_id);
        }
        return true;
      }

      case 'bulk_update': {
        if (history.previous_data && Array.isArray(history.previous_data)) {
          for (const prevItem of history.previous_data as Record<string, unknown>[]) {
            if (prevItem.id) {
              await supabase
                .from('transactions')
                .update(prevItem)
                .eq('id', prevItem.id);
            }
          }
        }
        return true;
      }

      case 'bulk_delete': {
        if (history.affected_ids && history.affected_ids.length > 0) {
          await supabase
            .from('transactions')
            .update({ is_deleted: false })
            .in('id', history.affected_ids);
        }
        return true;
      }

      default:
        return false;
    }
  } catch {
    return false;
  }
}
