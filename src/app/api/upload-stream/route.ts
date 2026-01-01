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
  deleteTransactionsByFileId,
  deleteUploadedFile,
} from '@/lib/supabase/queries';
import { createActionHistory } from '@/lib/repositories/action-history.repo';
import { createManualEntries } from '@/lib/repositories/manual-entries.repo';
import { classifyTransactions, classifyIncomeTransactions, applyMerchantNameMappings } from '@/lib/classifier';
import type { CreateTransactionDto, Owner, Category } from '@/types';
import { OWNER_NAMES } from '@/lib/ingestion/constants';
import {
  extractBillingMonthFromFilename,
  extractBillingMonthFromTransactions,
  generateDisplayName,
} from '@/lib/ingestion/billing';
import { buildManualTransactions } from '@/lib/ingestion/manual';
import {
  prepareClassificationInputs,
  mergeCategoryMaps,
} from '@/lib/ingestion/classify';
import { buildTransactionsWithFileId } from '@/lib/ingestion/transform';

/** SSE 이벤트 전송 헬퍼 */
function sendEvent(controller: ReadableStreamDefaultController, event: string, data: unknown) {
  const encoder = new TextEncoder();
  controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
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

              const transactionsToInsert: CreateTransactionDto[] = buildManualTransactions(
                parseResult.data,
                owner
              );

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

            // AI 분류 준비 - 기본 카테고리만 분류
            const prep = prepareClassificationInputs(mappedData, 'defaultOnly');
            const { expenseInputs, incomeInputs, installmentIndices } = prep;
            const totalToClassify = expenseInputs.length + incomeInputs.length;

            sendEvent(controller, 'classifying_start', {
              fileIndex,
              fileName,
              total: totalToClassify,
            });

            // AI 분류 (진행 상황 콜백 포함) - 지출/소득 각각
            let categoryMap: Map<number, Category> = new Map();

            try {
              let expenseMap: Map<number, Category> = new Map();
              let incomeMap: Map<number, Category> = new Map();

              if (expenseInputs.length > 0) {
                expenseMap = await classifyTransactions(
                  expenseInputs,
                  (current, total, phase) => {
                    sendEvent(controller, 'classifying_progress', {
                      fileIndex,
                      fileName,
                      current,
                      total: totalToClassify,
                      phase,
                    });
                  }
                );
              }

              if (incomeInputs.length > 0) {
                incomeMap = await classifyIncomeTransactions(
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
              }

              categoryMap = mergeCategoryMaps(expenseMap, incomeMap);
            } catch (error) {
              console.error('AI 분류 실패, 기본 카테고리 사용:', error);
            }

            sendEvent(controller, 'classifying_complete', {
              fileIndex,
              fileName,
            });

            // DB에 저장할 데이터 준비
            const transactionsToInsert = buildTransactionsWithFileId({
              mappedData,
              originalData: parseResult.data,
              categoryMap,
              installmentIndices,
              billingMonth,
              sourceType: parseResult.source_type,
              owner,
              fileId,
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
