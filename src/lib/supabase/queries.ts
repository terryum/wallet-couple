/**
 * Supabase 쿼리 함수
 * 거래 내역 CRUD 및 집계 쿼리
 */

import { supabase } from './client';
import type {
  Transaction,
  CreateTransactionDto,
  UpdateTransactionDto,
  TransactionQueryParams,
  Category,
  Owner,
  ActionHistory,
  CreateActionHistoryDto,
} from '@/types';

/** 쿼리 결과 타입 */
export interface QueryResult<T> {
  data: T | null;
  error: string | null;
}

/**
 * 거래 내역 조회 (월별)
 * @param params.transactionType - 'expense' | 'income' | 'all' (기본: 'expense')
 */
export async function getTransactions(
  params: TransactionQueryParams
): Promise<QueryResult<Transaction[]>> {
  try {
    const { month, sort = 'date_desc', category, owner, transactionType = 'expense' } = params;

    // 월의 시작일과 종료일 계산
    const startDate = `${month}-01`;
    const [year, monthNum] = month.split('-').map(Number);
    // 해당 월의 마지막 날 계산 (toISOString은 UTC 변환으로 날짜가 밀릴 수 있으므로 사용하지 않음)
    const lastDay = new Date(year, monthNum, 0).getDate();
    const endDate = `${month}-${String(lastDay).padStart(2, '0')}`;

    let query = supabase
      .from('transactions')
      .select('*')
      .eq('is_deleted', false)
      .gte('transaction_date', startDate)
      .lte('transaction_date', endDate);

    // 트랜잭션 타입 필터 (기본: 지출만)
    if (transactionType !== 'all') {
      query = query.eq('transaction_type', transactionType);
    }

    // 필터 적용
    if (category) {
      query = query.eq('category', category);
    }

    if (owner) {
      query = query.eq('owner', owner);
    }

    // 정렬 적용
    switch (sort) {
      case 'date_asc':
        query = query.order('transaction_date', { ascending: true });
        break;
      case 'date_desc':
        query = query.order('transaction_date', { ascending: false });
        break;
      case 'amount_asc':
        query = query.order('amount', { ascending: true });
        break;
      case 'amount_desc':
        query = query.order('amount', { ascending: false });
        break;
    }

    const { data, error } = await query;

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as Transaction[], error: null };
  } catch (err) {
    return { data: null, error: String(err) };
  }
}

/**
 * 단일 거래 내역 조회
 */
export async function getTransactionById(
  id: string
): Promise<QueryResult<Transaction>> {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as Transaction, error: null };
  } catch (err) {
    return { data: null, error: String(err) };
  }
}

/**
 * 거래 내역 일괄 생성 (Bulk Insert)
 * 부분 유니크 인덱스 (WHERE is_deleted = FALSE) 때문에 개별 insert로 처리
 */
export async function createTransactions(
  transactions: CreateTransactionDto[]
): Promise<QueryResult<{ inserted: number; duplicates: number }>> {
  try {
    if (transactions.length === 0) {
      return { data: { inserted: 0, duplicates: 0 }, error: null };
    }

    let inserted = 0;
    let duplicates = 0;

    // 개별 insert로 중복 처리
    for (const t of transactions) {
      const { error: insertError } = await supabase
        .from('transactions')
        .insert({ ...t, is_deleted: false });

      if (insertError) {
        // 23505는 unique_violation 에러 코드
        if (insertError.code === '23505') {
          duplicates++;
        } else {
          // 다른 에러는 로그만 남기고 계속 진행
          console.error('Insert error:', insertError.message);
          duplicates++;
        }
      } else {
        inserted++;
      }
    }

    return { data: { inserted, duplicates }, error: null };
  } catch (err) {
    return { data: null, error: String(err) };
  }
}

/**
 * 거래 내역 수정
 */
export async function updateTransaction(
  id: string,
  updates: UpdateTransactionDto
): Promise<QueryResult<Transaction>> {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as Transaction, error: null };
  } catch (err) {
    return { data: null, error: String(err) };
  }
}

/**
 * 거래 내역 삭제 (Soft Delete)
 */
export async function deleteTransaction(
  id: string
): Promise<QueryResult<boolean>> {
  try {
    const { error } = await supabase
      .from('transactions')
      .update({ is_deleted: true })
      .eq('id', id);

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: true, error: null };
  } catch (err) {
    return { data: null, error: String(err) };
  }
}

/**
 * 월별 카테고리별 집계
 * @param transactionType - 'expense' | 'income' | 'all' (기본: 'expense' - 지출만)
 */
export async function getMonthlyAggregation(
  month: string,
  owner?: Owner,
  transactionType: 'expense' | 'income' | 'all' = 'expense'
): Promise<
  QueryResult<{ category: Category; total: number; count: number }[]>
> {
  try {
    const startDate = `${month}-01`;
    const [year, monthNum] = month.split('-').map(Number);
    // 해당 월의 마지막 날 계산 (toISOString은 UTC 변환으로 날짜가 밀릴 수 있으므로 사용하지 않음)
    const lastDay = new Date(year, monthNum, 0).getDate();
    const endDate = `${month}-${String(lastDay).padStart(2, '0')}`;

    let query = supabase
      .from('transactions')
      .select('category, amount')
      .eq('is_deleted', false)
      .gte('transaction_date', startDate)
      .lte('transaction_date', endDate);

    // 트랜잭션 타입 필터 (기본: 지출만)
    if (transactionType !== 'all') {
      query = query.eq('transaction_type', transactionType);
    }

    if (owner) {
      query = query.eq('owner', owner);
    }

    const { data, error } = await query;

    if (error) {
      return { data: null, error: error.message };
    }

    // 카테고리별 집계
    const aggregation = (data || []).reduce(
      (acc, item) => {
        const cat = item.category as Category;
        if (!acc[cat]) {
          acc[cat] = { total: 0, count: 0 };
        }
        acc[cat].total += (item.amount ?? 0);
        acc[cat].count += 1;
        return acc;
      },
      {} as Record<Category, { total: number; count: number }>
    );

    const result = Object.entries(aggregation).map(([category, stats]) => ({
      category: category as Category,
      total: stats.total,
      count: stats.count,
    }));

    // 금액 기준 내림차순 정렬
    result.sort((a, b) => b.total - a.total);

    return { data: result, error: null };
  } catch (err) {
    return { data: null, error: String(err) };
  }
}

/**
 * 월별 총액 조회
 * @param transactionType - 'expense' | 'income' | 'all' (기본: 'expense' - 지출만)
 */
export async function getMonthlyTotal(
  month: string,
  owner?: Owner,
  transactionType: 'expense' | 'income' | 'all' = 'expense'
): Promise<QueryResult<number>> {
  try {
    const startDate = `${month}-01`;
    const [year, monthNum] = month.split('-').map(Number);
    // 해당 월의 마지막 날 계산 (toISOString은 UTC 변환으로 날짜가 밀릴 수 있으므로 사용하지 않음)
    const lastDay = new Date(year, monthNum, 0).getDate();
    const endDate = `${month}-${String(lastDay).padStart(2, '0')}`;

    let query = supabase
      .from('transactions')
      .select('amount')
      .eq('is_deleted', false)
      .gte('transaction_date', startDate)
      .lte('transaction_date', endDate);

    // 트랜잭션 타입 필터 (기본: 지출만)
    if (transactionType !== 'all') {
      query = query.eq('transaction_type', transactionType);
    }

    if (owner) {
      query = query.eq('owner', owner);
    }

    const { data, error } = await query;

    if (error) {
      return { data: null, error: error.message };
    }

    const total = (data || []).reduce((sum, item) => sum + (item.amount ?? 0), 0);

    return { data: total, error: null };
  } catch (err) {
    return { data: null, error: String(err) };
  }
}

// ============================================
// 파일 관리 관련 쿼리
// ============================================

/** 업로드된 파일 정보 타입 */
export interface UploadedFile {
  id: string;
  original_filename: string;
  display_name: string;
  owner: Owner;
  source_type: string;
  billing_month: string | null;
  transaction_count: number;
  billing_total: number | null; // 이용대금명세서상의 청구 총액
  file_content: string | null; // base64 encoded file content for download
  created_at: string;
}

/** 파일 생성 DTO */
export interface CreateFileDto {
  original_filename: string;
  display_name: string;
  owner: Owner;
  source_type: string;
  billing_month?: string;
  transaction_count?: number;
  billing_total?: number; // 이용대금명세서상의 청구 총액
  file_content?: string; // base64 encoded file content for download
}

/**
 * 업로드된 파일 정보 저장
 */
export async function createUploadedFile(
  fileData: CreateFileDto
): Promise<QueryResult<UploadedFile>> {
  try {
    const { data, error } = await supabase
      .from('uploaded_files')
      .insert(fileData)
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as UploadedFile, error: null };
  } catch (err) {
    return { data: null, error: String(err) };
  }
}

/**
 * 업로드된 파일 목록 조회
 */
export async function getUploadedFiles(): Promise<QueryResult<UploadedFile[]>> {
  try {
    const { data, error } = await supabase
      .from('uploaded_files')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as UploadedFile[], error: null };
  } catch (err) {
    return { data: null, error: String(err) };
  }
}

/**
 * 단일 파일 조회 (다운로드용)
 */
export async function getUploadedFileById(
  fileId: string
): Promise<QueryResult<UploadedFile>> {
  try {
    const { data, error } = await supabase
      .from('uploaded_files')
      .select('*')
      .eq('id', fileId)
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as UploadedFile, error: null };
  } catch (err) {
    return { data: null, error: String(err) };
  }
}

/**
 * 파일 삭제 (관련 거래 내역도 CASCADE로 삭제됨)
 */
/**
 * 특정 파일에 속한 거래 내역 모두 삭제
 */
export async function deleteTransactionsByFileId(
  fileId: string
): Promise<QueryResult<number>> {
  try {
    // 먼저 해당 파일의 거래 수 확인
    const { data: transactions } = await supabase
      .from('transactions')
      .select('id')
      .eq('file_id', fileId);

    const count = transactions?.length || 0;

    // 거래 삭제
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('file_id', fileId);

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: count, error: null };
  } catch (err) {
    return { data: null, error: String(err) };
  }
}

/**
 * 특정 파일에 속한 거래 내역 조회
 */
export async function getTransactionsByFileId(
  fileId: string
): Promise<QueryResult<Transaction[]>> {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('file_id', fileId)
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

export async function deleteUploadedFile(
  fileId: string
): Promise<QueryResult<boolean>> {
  try {
    const { error } = await supabase
      .from('uploaded_files')
      .delete()
      .eq('id', fileId);

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: true, error: null };
  } catch (err) {
    return { data: null, error: String(err) };
  }
}

/**
 * 모든 파일 삭제 (전체 초기화)
 * @param preserveMappings - true인 경우 이름/카테고리 매핑은 유지
 */
export async function deleteAllFiles(
  preserveMappings: boolean = false
): Promise<QueryResult<number>> {
  try {
    // 먼저 파일 수를 가져옴
    const { data: files } = await supabase
      .from('uploaded_files')
      .select('id');

    const count = files?.length || 0;

    // 모든 파일 삭제 (CASCADE로 거래 내역도 삭제됨)
    const { error } = await supabase
      .from('uploaded_files')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // 모든 행 삭제

    if (error) {
      return { data: null, error: error.message };
    }

    // 매핑 유지하지 않는 경우 매핑도 삭제
    if (!preserveMappings) {
      // category_mappings 삭제
      await supabase
        .from('category_mappings')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      // merchant_name_mappings 삭제
      await supabase
        .from('merchant_name_mappings')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
    }

    return { data: count, error: null };
  } catch (err) {
    return { data: null, error: String(err) };
  }
}

/**
 * 거래 내역 일괄 생성 (파일 ID 포함)
 *
 * 중복 체크 로직:
 * - 다른 파일에서 같은 (날짜, 가맹점, 금액, 소스타입, 오너)가 있으면 중복
 * - 같은 파일 내에서는 중복 체크 안함 (같은 날 같은 가맹점 2번 결제 가능)
 */
export async function createTransactionsWithFileId(
  transactions: (CreateTransactionDto & { file_id: string })[]
): Promise<QueryResult<{ inserted: number; duplicates: number }>> {
  try {
    if (transactions.length === 0) {
      return { data: { inserted: 0, duplicates: 0 }, error: null };
    }

    // 1. 해당 파일의 거래 날짜 범위 구하기
    const dates = transactions.map(t => t.transaction_date).sort();
    const minDate = dates[0];
    const maxDate = dates[dates.length - 1];

    // 2. 해당 기간의 기존 거래 조회 (다른 파일에서 올린 것들)
    const fileId = transactions[0].file_id;
    const owner = transactions[0].owner;
    const sourceType = transactions[0].source_type;

    const { data: existingTransactions } = await supabase
      .from('transactions')
      .select('transaction_date, merchant_name, amount')
      .eq('is_deleted', false)
      .eq('owner', owner)
      .eq('source_type', sourceType)
      .neq('file_id', fileId) // 현재 파일 제외
      .gte('transaction_date', minDate)
      .lte('transaction_date', maxDate);

    // 3. 기존 거래를 Set으로 만들어 O(1) 조회
    const existingSet = new Set(
      (existingTransactions || []).map(t =>
        `${t.transaction_date}|${t.merchant_name}|${t.amount}`
      )
    );

    // 4. 중복 아닌 것만 필터링
    const newTransactions: (CreateTransactionDto & { file_id: string })[] = [];
    let duplicates = 0;

    for (const t of transactions) {
      const key = `${t.transaction_date}|${t.merchant_name}|${t.amount}`;
      if (existingSet.has(key)) {
        duplicates++;
      } else {
        newTransactions.push(t);
      }
    }

    // 5. 새 거래들 일괄 삽입
    if (newTransactions.length > 0) {
      const { error: insertError } = await supabase
        .from('transactions')
        .insert(newTransactions.map(t => ({ ...t, is_deleted: false })));

      if (insertError) {
        console.error('Bulk insert error:', insertError.message);
        return { data: null, error: insertError.message };
      }
    }

    return { data: { inserted: newTransactions.length, duplicates }, error: null };
  } catch (err) {
    return { data: null, error: String(err) };
  }
}

/**
 * 파일의 거래 건수 업데이트
 */
export async function updateFileTransactionCount(
  fileId: string,
  count: number
): Promise<QueryResult<boolean>> {
  try {
    const { error } = await supabase
      .from('uploaded_files')
      .update({ transaction_count: count })
      .eq('id', fileId);

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: true, error: null };
  } catch (err) {
    return { data: null, error: String(err) };
  }
}

/**
 * 전체 초기화 - 모든 데이터 삭제
 * transactions, uploaded_files + 사용자 커스텀 설정 (옵션)
 *
 * @param preserveCustomizations - true인 경우 사용자 커스텀 설정은 유지
 *   (카테고리 매핑, 이용처명 매핑 등 - registry.ts에 등록된 모든 항목)
 */
export async function resetAllData(
  preserveCustomizations: boolean = false
): Promise<QueryResult<{ deleted: Record<string, number> }>> {
  // 순환 참조 방지를 위해 동적 import 사용
  const { deleteAllCustomizations, CUSTOMIZATION_CONFIGS } = await import(
    '@/lib/customizations'
  );

  try {
    const deleted: Record<string, number> = {};

    // 1. transactions 테이블
    const { data: txData } = await supabase.from('transactions').select('id');
    deleted.transactions = txData?.length || 0;

    const { error: txError } = await supabase
      .from('transactions')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (txError) throw new Error(`transactions 삭제 실패: ${txError.message}`);

    // 2. uploaded_files 테이블
    const { data: filesData } = await supabase.from('uploaded_files').select('id');
    deleted.uploaded_files = filesData?.length || 0;

    const { error: filesError } = await supabase
      .from('uploaded_files')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (filesError) throw new Error(`uploaded_files 삭제 실패: ${filesError.message}`);

    // 3. 사용자 커스텀 설정 삭제 (레지스트리 기반)
    // preserveCustomizations가 false인 경우에만 삭제
    if (!preserveCustomizations) {
      const customResult = await deleteAllCustomizations();

      // 삭제된 개수를 deleted에 병합
      for (const config of CUSTOMIZATION_CONFIGS) {
        deleted[config.tableName] = customResult.deleted[config.tableName] || 0;
      }

      if (!customResult.success) {
        console.error('커스텀 설정 삭제 중 일부 오류:', customResult.errors);
      }
    } else {
      // 유지하는 경우 0으로 표시
      for (const config of CUSTOMIZATION_CONFIGS) {
        deleted[config.tableName] = 0;
      }
    }

    // 4. action_history 테이블도 삭제
    await supabase
      .from('action_history')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    return { data: { deleted }, error: null };
  } catch (err) {
    return { data: null, error: String(err) };
  }
}

// ============================================
// 액션 히스토리 관련 쿼리
// ============================================

/**
 * 액션 히스토리 생성
 */
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

/**
 * 액션 히스토리 조회 (최근 N개)
 */
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

/**
 * 특정 시점 이후의 액션 되돌리기
 * - 해당 히스토리부터 그 이후 모든 액션을 역순으로 되돌림
 */
export async function undoActionsFromHistory(
  historyId: string
): Promise<QueryResult<{ undone: number }>> {
  try {
    // 1. 해당 히스토리 조회
    const { data: targetHistory, error: targetError } = await supabase
      .from('action_history')
      .select('*')
      .eq('id', historyId)
      .single();

    if (targetError || !targetHistory) {
      return { data: null, error: '히스토리를 찾을 수 없습니다.' };
    }

    // 2. 해당 시점부터 최신까지의 모든 히스토리 조회 (최신순)
    const { data: histories, error: historyError } = await supabase
      .from('action_history')
      .select('*')
      .gte('created_at', targetHistory.created_at)
      .order('created_at', { ascending: false });

    if (historyError || !histories) {
      return { data: null, error: '히스토리 조회 실패' };
    }

    let undone = 0;

    // 3. 각 액션을 역순으로 되돌리기
    for (const history of histories) {
      const success = await undoSingleAction(history as ActionHistory);
      if (success) undone++;
    }

    // 4. 되돌린 히스토리들 삭제
    await supabase
      .from('action_history')
      .delete()
      .gte('created_at', targetHistory.created_at);

    return { data: { undone }, error: null };
  } catch (err) {
    return { data: null, error: String(err) };
  }
}

/**
 * 단일 액션 되돌리기
 */
async function undoSingleAction(history: ActionHistory): Promise<boolean> {
  try {
    switch (history.action_type) {
      case 'create': {
        // 생성 → 삭제
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
        // 수정 → 이전 데이터로 복원
        if (history.entity_type === 'transaction' && history.entity_id && history.previous_data) {
          await supabase
            .from('transactions')
            .update(history.previous_data)
            .eq('id', history.entity_id);
        }
        return true;
      }

      case 'delete': {
        // 삭제 → soft delete 해제
        if (history.entity_type === 'transaction' && history.entity_id) {
          await supabase
            .from('transactions')
            .update({ is_deleted: false })
            .eq('id', history.entity_id);
        }
        return true;
      }

      case 'upload': {
        // 파일 업로드 → 파일 및 관련 거래 삭제 (CASCADE)
        if (history.entity_id) {
          await supabase
            .from('uploaded_files')
            .delete()
            .eq('id', history.entity_id);
        }
        return true;
      }

      case 'bulk_update': {
        // 일괄 수정 → 각 거래를 이전 상태로 복원
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
        // 일괄 삭제 → soft delete 해제
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

// ============================================
// 직접입력 관련 쿼리
// ============================================

/**
 * 직접입력 거래 내역 조회 (owner별)
 */
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

/**
 * 직접입력 거래 내역 개수 조회 (owner별)
 */
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

/**
 * 직접입력 거래 내역 일괄 저장 (file_id 없이)
 * 중복 체크: (날짜, 가맹점, 금액, owner)가 같은 기존 직접입력 내역
 */
export async function createManualEntries(
  transactions: CreateTransactionDto[]
): Promise<QueryResult<{ inserted: number; duplicates: number }>> {
  try {
    if (transactions.length === 0) {
      return { data: { inserted: 0, duplicates: 0 }, error: null };
    }

    // 1. 해당 기간의 기존 직접입력 거래 조회
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

    // 2. 기존 거래를 Set으로 만들어 O(1) 조회
    const existingSet = new Set(
      (existingTransactions || []).map(t =>
        `${t.transaction_date}|${t.merchant_name}|${t.amount}`
      )
    );

    // 3. 중복 아닌 것만 필터링
    const newTransactions: CreateTransactionDto[] = [];
    let duplicates = 0;

    for (const t of transactions) {
      const key = `${t.transaction_date}|${t.merchant_name}|${t.amount}`;
      if (existingSet.has(key)) {
        duplicates++;
      } else {
        newTransactions.push(t);
        // 새로 추가된 것도 Set에 추가하여 같은 파일 내 중복 방지
        existingSet.add(key);
      }
    }

    // 4. 새 거래들 일괄 삽입
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

// ============================================
// 검색 관련 쿼리
// ============================================

import type { TransactionSearchParams, SearchResult } from '@/types';

/**
 * 거래 내역 검색 (고급 필터링)
 * - 기간, 이용처, 카테고리(복수), 금액범위, 결제수단(복수) 필터 지원
 */
export async function searchTransactions(
  params: TransactionSearchParams
): Promise<QueryResult<SearchResult>> {
  try {
    const {
      startDate,
      endDate,
      merchantSearch,
      categories,
      sourceTypes,
      amountMin,
      amountMax,
      owner,
      transactionType = 'expense',
      sort = 'date_desc',
      limit = 100,
      offset = 0,
    } = params;

    let query = supabase
      .from('transactions')
      .select('*', { count: 'exact' })
      .eq('is_deleted', false);

    // 기간 필터
    if (startDate) {
      query = query.gte('transaction_date', startDate);
    }
    if (endDate) {
      query = query.lte('transaction_date', endDate);
    }

    // 이용처 검색 (ILIKE - 대소문자 무시)
    if (merchantSearch && merchantSearch.trim()) {
      query = query.ilike('merchant_name', `%${merchantSearch.trim()}%`);
    }

    // 복수 카테고리 필터 (IN)
    if (categories && categories.trim()) {
      const categoryList = categories.split(',').map(c => c.trim());
      query = query.in('category', categoryList);
    }

    // 복수 결제수단 필터 (IN)
    if (sourceTypes && sourceTypes.trim()) {
      const sourceList = sourceTypes.split(',').map(s => s.trim());
      query = query.in('source_type', sourceList);
    }

    // 금액 범위 필터
    if (amountMin !== undefined && amountMin > 0) {
      query = query.gte('amount', amountMin);
    }
    if (amountMax !== undefined && amountMax > 0) {
      query = query.lte('amount', amountMax);
    }

    // Owner 필터
    if (owner) {
      query = query.eq('owner', owner);
    }

    // 거래 유형 필터
    if (transactionType !== 'all') {
      query = query.eq('transaction_type', transactionType);
    }

    // 정렬 적용
    switch (sort) {
      case 'date_asc':
        query = query.order('transaction_date', { ascending: true });
        break;
      case 'date_desc':
        query = query.order('transaction_date', { ascending: false });
        break;
      case 'amount_asc':
        query = query.order('amount', { ascending: true });
        break;
      case 'amount_desc':
        query = query.order('amount', { ascending: false });
        break;
    }

    // 페이지네이션
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      return { data: null, error: error.message };
    }

    const totalCount = count || 0;
    const hasMore = offset + limit < totalCount;

    return {
      data: {
        data: data as Transaction[],
        count: totalCount,
        hasMore,
      },
      error: null,
    };
  } catch (err) {
    return { data: null, error: String(err) };
  }
}
