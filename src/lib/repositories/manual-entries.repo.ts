import { supabase } from '@/lib/supabase/client';
import type { CreateTransactionDto, Owner, Transaction } from '@/types';
import type { QueryResult } from '@/lib/supabase/queries';

export async function getManualEntries(
  owner: Owner
): Promise<QueryResult<Transaction[]>> {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('source_type', '직접입력')
      .eq('owner', owner)
      .eq('is_deleted', false)
      .order('transaction_date', { ascending: false });

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as Transaction[], error: null };
  } catch (err) {
    return { data: null, error: String(err) };
  }
}

export async function getManualEntryCount(
  owner: Owner
): Promise<QueryResult<number>> {
  try {
    const { count, error } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('source_type', '직접입력')
      .eq('owner', owner)
      .eq('is_deleted', false);

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: count || 0, error: null };
  } catch (err) {
    return { data: null, error: String(err) };
  }
}

export async function createManualEntries(
  transactions: CreateTransactionDto[]
): Promise<QueryResult<{ inserted: number; duplicates: number }>> {
  try {
    if (transactions.length === 0) {
      return { data: { inserted: 0, duplicates: 0 }, error: null };
    }

    const dates = transactions.map(t => t.transaction_date).sort();
    const minDate = dates[0];
    const maxDate = dates[dates.length - 1];
    const owner = transactions[0].owner;

    const { data: existingTransactions } = await supabase
      .from('transactions')
      .select('transaction_date, merchant_name, amount')
      .eq('is_deleted', false)
      .eq('owner', owner)
      .eq('source_type', '직접입력')
      .gte('transaction_date', minDate)
      .lte('transaction_date', maxDate);

    const existingSet = new Set(
      (existingTransactions || []).map(t =>
        `${t.transaction_date}|${t.merchant_name}|${t.amount}`
      )
    );

    const newTransactions: CreateTransactionDto[] = [];
    let duplicates = 0;

    for (const t of transactions) {
      const key = `${t.transaction_date}|${t.merchant_name}|${t.amount}`;
      if (existingSet.has(key)) {
        duplicates++;
      } else {
        newTransactions.push(t);
        existingSet.add(key);
      }
    }

    if (newTransactions.length > 0) {
      const { error: insertError } = await supabase
        .from('transactions')
        .insert(newTransactions.map(t => ({ ...t, is_deleted: false })));

      if (insertError) {
        console.error('Manual entry insert error:', insertError.message);
        return { data: null, error: insertError.message };
      }
    }

    return { data: { inserted: newTransactions.length, duplicates }, error: null };
  } catch (err) {
    return { data: null, error: String(err) };
  }
}
