import type { Category, CreateTransactionDto, Owner, ParsedTransaction, SourceType } from '@/types';
import { getInstallmentDate } from './billing';

interface BuildTransactionsParams {
  mappedData: ParsedTransaction[];
  originalData: ParsedTransaction[];
  categoryMap: Map<number, Category>;
  installmentIndices: Set<number>;
  billingMonth: string | null;
  sourceType: SourceType;
  owner: Owner;
  fileId: string;
}

/**
 * 업로드 결과를 DB 삽입 DTO로 변환
 */
export function buildTransactionsWithFileId({
  mappedData,
  originalData,
  categoryMap,
  installmentIndices,
  billingMonth,
  sourceType,
  owner,
  fileId,
}: BuildTransactionsParams): (CreateTransactionDto & { file_id: string })[] {
  return mappedData.map((item, idx) => {
    const isInstallment = installmentIndices.has(idx);
    return {
      transaction_date: isInstallment
        ? getInstallmentDate(item.date, billingMonth)
        : item.date,
      merchant_name: item.merchant,
      amount: item.amount,
      category: isInstallment
        ? '기존할부'
        : (categoryMap.get(idx) || item.category),
      source_type: sourceType,
      owner,
      transaction_type: item.transaction_type || 'expense',
      raw_data: { original: originalData[idx], row_index: idx },
      file_id: fileId,
    };
  });
}
