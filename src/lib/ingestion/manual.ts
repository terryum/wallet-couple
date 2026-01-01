import type { CreateTransactionDto, Owner, ParsedTransaction } from '@/types';

/**
 * 직접입력 거래 내역 변환
 */
export function buildManualTransactions(
  items: ParsedTransaction[],
  owner: Owner
): CreateTransactionDto[] {
  return items.map((item) => ({
    transaction_date: item.date,
    merchant_name: item.merchant,
    amount: item.amount,
    category: item.category,
    source_type: '직접입력',
    owner,
    raw_data: { original: item },
  }));
}
