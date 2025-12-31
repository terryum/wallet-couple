/**
 * POST /api/upload-stream
 * 스트리밍 파일 업로드 및 파싱 API
 * SSE로 진행 상황을 실시간으로 전송
 */

import { NextRequest } from 'next/server';
import { parseFile } from '@/lib/loaders';
import {
  createUploadedFile,
  createTransactionsWithFileId,
  updateFileTransactionCount,
  createActionHistory,
  createManualEntries,
  deleteTransactionsByFileId,
  deleteUploadedFile,
} from '@/lib/supabase/queries';
import { classifyTransactions, classifyIncomeTransactions, applyMerchantNameMappings, type ClassifyInput } from '@/lib/classifier';
import type { CreateTransactionDto, Owner, ParsedTransaction, Category } from '@/types';

/** 카드사 이름 매핑 */
const SOURCE_TYPE_NAMES: Record<string, string> = {
  '현대카드': '현대카드',
  '롯데카드': '롯데카드',
  '삼성카드': '삼성카드',
  'KB카드': 'KB카드',
  '토스뱅크카드': '토스뱅크카드',
  '온누리': '온누리상품권',
  '성남사랑': '성남사랑상품권',
  '직접입력': '직접입력',
  '기타': '기타',
};

/** Owner 한글 이름 */
const OWNER_NAMES: Record<Owner, string> = {
  husband: '남편',
  wife: '아내',
};

/** SSE 이벤트 전송 헬퍼 */
function sendEvent(controller: ReadableStreamDefaultController, event: string, data: unknown) {
  const encoder = new TextEncoder();
  controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
}

/**
 * 파일 이름에서 청구월 추출 시도
 */
function extractBillingMonthFromFilename(filename: string): string | null {
  const patterns = [
    /(\d{4})(\d{2})/,
    /(\d{4})[-_](\d{2})/,
    /(\d{4})년\s*(\d{1,2})월/,
  ];

  for (const pattern of patterns) {
    const match = filename.match(pattern);
    if (match) {
      const year = match[1];
      const month = match[2].padStart(2, '0');
      return `${year}-${month}`;
    }
  }
  return null;
}

/**
 * 거래 내역에서 청구월 추출
 */
function extractBillingMonthFromTransactions(transactions: ParsedTransaction[]): string | null {
  if (transactions.length === 0) return null;

  const normalTransactions = transactions.filter(t => !t.is_installment);
  const dates = normalTransactions
    .map(t => t.date)
    .filter(d => d)
    .sort()
    .reverse();

  if (dates.length === 0) return null;
  return dates[0].substring(0, 7);
}

/**
 * 표시용 파일 이름 생성
 */
function generateDisplayName(
  originalFilename: string,
  sourceType: string,
  owner: Owner,
  billingMonth: string | null
): string {
  const ext = originalFilename.split('.').pop() || 'xls';
  const sourceName = SOURCE_TYPE_NAMES[sourceType] || sourceType;
  const ownerName = OWNER_NAMES[owner];

  if (billingMonth) {
    const [year, month] = billingMonth.split('-');
    return `${year}년_${parseInt(month)}월_${ownerName}_${sourceName}.${ext}`;
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return `${year}년_${month}월_${ownerName}_${sourceName}.${ext}`;
}

export async function POST(request: NextRequest): Promise<Response> {
  const formData = await request.formData();
  const files = formData.getAll('files') as File[];
  const owner = (formData.get('owner') as Owner) || 'husband';
  const password = formData.get('password') as string | null;

  if (!files || files.length === 0) {
    return new Response(JSON.stringify({ error: '파일이 없습니다.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 롤백을 위한 생성된 파일/거래 ID 추적
  const createdFileIds: string[] = [];

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
          const file = files[fileIndex];
          const fileName = file.name;

          sendEvent(controller, 'file_start', {
            fileIndex,
            totalFiles: files.length,
            fileName,
          });

          try {
            const buffer = await file.arrayBuffer();
            const fileContentBase64 = Buffer.from(buffer).toString('base64');

            sendEvent(controller, 'parsing', { fileIndex, fileName });

            const parseResult = await parseFile(buffer, {
              fileName,
              owner,
              password: password || undefined,
            });

            if (!parseResult.success) {
              sendEvent(controller, 'file_error', {
                fileIndex,
                fileName,
                error: parseResult.error,
                error_code: parseResult.error_code,
              });
              continue;
            }

            // 직접입력 파일 처리
            if (parseResult.source_type === '직접입력') {
              const ownerName = OWNER_NAMES[owner];
              const displayName = `${ownerName}_직접입력.xlsx`;

              const transactionsToInsert: CreateTransactionDto[] = parseResult.data.map((item) => ({
                transaction_date: item.date,
                merchant_name: item.merchant,
                amount: item.amount,
                category: item.category,
                source_type: '직접입력',
                owner,
                raw_data: { original: item },
              }));

              const insertResult = await createManualEntries(transactionsToInsert);

              if (insertResult.error) {
                sendEvent(controller, 'file_error', {
                  fileIndex,
                  fileName,
                  error: insertResult.error,
                });
                continue;
              }

              const { inserted, duplicates } = insertResult.data!;

              if (inserted > 0) {
                await createActionHistory({
                  action_type: 'upload',
                  entity_type: 'transactions',
                  description: `직접입력 업로드 (${ownerName}, ${inserted}건)`,
                  new_data: {
                    source_type: '직접입력',
                    inserted,
                    duplicates,
                  },
                  owner,
                });
              }

              sendEvent(controller, 'file_complete', {
                fileIndex,
                fileName,
                displayName,
                sourceType: '직접입력',
                inserted,
                duplicates,
              });
              continue;
            }

            const billingMonth =
              extractBillingMonthFromTransactions(parseResult.data) ||
              extractBillingMonthFromFilename(fileName);

            const displayName = generateDisplayName(
              fileName,
              parseResult.source_type,
              owner,
              billingMonth
            );

            // 파일 정보 저장
            const fileResult = await createUploadedFile({
              original_filename: fileName,
              display_name: displayName,
              owner,
              source_type: parseResult.source_type,
              billing_month: billingMonth || undefined,
              transaction_count: 0,
              billing_total: parseResult.billing_total,
              file_content: fileContentBase64,
            });

            if (fileResult.error || !fileResult.data) {
              sendEvent(controller, 'file_error', {
                fileIndex,
                fileName,
                error: fileResult.error || '파일 정보 저장 실패',
              });
              continue;
            }

            const fileId = fileResult.data.id;
            createdFileIds.push(fileId);

            // 이용처명 매핑 적용
            const mappedData = await applyMerchantNameMappings(parseResult.data);

            // AI 분류 준비 - 지출/소득 분리
            // 로더가 설정한 특정 카테고리는 유지하고, 기본 카테고리만 AI 분류
            const expenseInputs: ClassifyInput[] = [];
            const incomeInputs: ClassifyInput[] = [];
            const installmentIndices = new Set<number>();
            const presetCategories = new Set<number>(); // 로더가 설정한 카테고리 인덱스

            mappedData.forEach((item, idx) => {
              if (item.is_installment === true || item.category === '기존할부') {
                installmentIndices.add(idx);
              } else if (item.transaction_type === 'income') {
                // 소득 거래 - '기타소득'만 AI 분류 대상
                if (item.category === '기타소득') {
                  incomeInputs.push({
                    index: idx,
                    merchant: item.merchant,
                    amount: item.amount,
                  });
                } else {
                  // 로더가 설정한 특정 카테고리 유지
                  presetCategories.add(idx);
                }
              } else {
                // 지출 거래 - '기타'만 AI 분류 대상
                if (item.category === '기타') {
                  expenseInputs.push({
                    index: idx,
                    merchant: item.merchant,
                    amount: item.amount,
                  });
                } else {
                  // 로더가 설정한 특정 카테고리 유지
                  presetCategories.add(idx);
                }
              }
            });

            const totalToClassify = expenseInputs.length + incomeInputs.length;

            sendEvent(controller, 'classifying_start', {
              fileIndex,
              fileName,
              total: totalToClassify,
            });

            // AI 분류 (진행 상황 콜백 포함) - 지출/소득 각각
            let categoryMap: Map<number, Category> = new Map();
            let classifiedCount = 0;

            try {
              // 지출 분류
              if (expenseInputs.length > 0) {
                const expenseResults = await classifyTransactions(
                  expenseInputs,
                  (current, total, phase) => {
                    classifiedCount = current;
                    sendEvent(controller, 'classifying_progress', {
                      fileIndex,
                      fileName,
                      current: classifiedCount,
                      total: totalToClassify,
                      phase,
                    });
                  }
                );
                // 원본 인덱스로 매핑 (expenseInputs[i].index가 mappedData의 인덱스)
                expenseResults.forEach((cat, i) => {
                  categoryMap.set(expenseInputs[i].index, cat);
                });
              }

              // 소득 분류
              if (incomeInputs.length > 0) {
                const incomeResults = await classifyIncomeTransactions(
                  incomeInputs,
                  (current, total, phase) => {
                    sendEvent(controller, 'classifying_progress', {
                      fileIndex,
                      fileName,
                      current: expenseInputs.length + current,
                      total: totalToClassify,
                      phase,
                    });
                  }
                );
                // 원본 인덱스로 매핑 (incomeInputs[i].index가 mappedData의 인덱스)
                incomeResults.forEach((cat, i) => {
                  categoryMap.set(incomeInputs[i].index, cat);
                });
              }
            } catch (error) {
              console.error('AI 분류 실패, 기본 카테고리 사용:', error);
            }

            sendEvent(controller, 'classifying_complete', {
              fileIndex,
              fileName,
            });

            // 기존할부 날짜 처리
            const getInstallmentDate = (originalDate: string, targetMonth: string | null): string => {
              if (targetMonth) {
                return `${targetMonth}-25`;
              }
              return `${originalDate.substring(0, 7)}-25`;
            };

            // DB에 저장할 데이터 준비
            const transactionsToInsert: (CreateTransactionDto & { file_id: string })[] =
              mappedData.map((item, idx) => {
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
                  source_type: parseResult.source_type,
                  owner,
                  transaction_type: item.transaction_type || 'expense',
                  raw_data: { original: parseResult.data[idx], row_index: idx },
                  file_id: fileId,
                };
              });

            sendEvent(controller, 'saving', { fileIndex, fileName });

            // DB에 저장
            const insertResult = await createTransactionsWithFileId(transactionsToInsert);

            if (insertResult.error) {
              sendEvent(controller, 'file_error', {
                fileIndex,
                fileName,
                error: insertResult.error,
              });
              continue;
            }

            const { inserted, duplicates } = insertResult.data!;

            // 0건인 경우 파일 삭제 (중복 파일 등)
            if (inserted === 0) {
              // 생성된 파일 삭제
              await deleteUploadedFile(fileId);
              // createdFileIds에서도 제거
              const idx = createdFileIds.indexOf(fileId);
              if (idx > -1) {
                createdFileIds.splice(idx, 1);
              }

              sendEvent(controller, 'file_complete', {
                fileIndex,
                fileName,
                displayName,
                sourceType: parseResult.source_type,
                inserted: 0,
                duplicates,
                // fileId는 전달하지 않음 (삭제됨)
              });
              continue;
            }

            // 파일의 실제 거래 건수 업데이트
            await updateFileTransactionCount(fileId, inserted);

            // 히스토리 기록
            await createActionHistory({
              action_type: 'upload',
              entity_type: 'file',
              entity_id: fileId,
              description: `"${displayName}" 업로드 (${inserted}건)`,
              new_data: {
                file_id: fileId,
                display_name: displayName,
                source_type: parseResult.source_type,
                inserted,
                duplicates,
              },
              owner,
            });

            sendEvent(controller, 'file_complete', {
              fileIndex,
              fileName,
              displayName,
              sourceType: parseResult.source_type,
              inserted,
              duplicates,
              fileId,
            });

          } catch (err) {
            sendEvent(controller, 'file_error', {
              fileIndex,
              fileName,
              error: String(err),
            });
          }
        }

        sendEvent(controller, 'complete', { createdFileIds });
        controller.close();

      } catch (err) {
        sendEvent(controller, 'error', { error: String(err) });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

/**
 * DELETE /api/upload-stream
 * 업로드 롤백 - 생성된 파일과 거래 삭제
 */
export async function DELETE(request: NextRequest): Promise<Response> {
  try {
    const { fileIds } = await request.json();

    if (!fileIds || !Array.isArray(fileIds)) {
      return new Response(
        JSON.stringify({ error: 'fileIds 배열이 필요합니다.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 각 파일에 대해 거래 삭제 후 파일 삭제
    for (const fileId of fileIds) {
      await deleteTransactionsByFileId(fileId);
      await deleteUploadedFile(fileId);
    }

    return new Response(
      JSON.stringify({ success: true, deletedFiles: fileIds.length }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
