import { supabase } from '@/lib/supabase/client';

export interface TransactionAmountRow {
  source_type: string;
  amount: number;
}

export interface BillingFileRow {
  source_type: string;
  billing_total: number | null;
}

export async function fetchUsageByDateRange(startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from('transactions')
    .select('source_type, amount')
    .eq('is_deleted', false)
    .eq('transaction_type', 'expense')
    .gte('transaction_date', startDate)
    .lte('transaction_date', endDate);

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: (data || []) as TransactionAmountRow[], error: null };
}

export async function fetchBillingFilesByMonth(month: string) {
  const { data, error } = await supabase
    .from('uploaded_files')
    .select('source_type, billing_total')
    .eq('billing_month', month);

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: (data || []) as BillingFileRow[], error: null };
}
