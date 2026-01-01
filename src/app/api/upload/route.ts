/**
 * POST /api/upload
 * 파일 업로드 및 파싱 API
 * AI 카테고리 분류 포함
 * 파일 정보를 uploaded_files 테이블에 저장
 */

import { NextRequest, NextResponse } from 'next/server';
import { parseFile } from '@/lib/loaders';
import {
  createUploadedFile,
  createTransactionsWithFileId,
  updateFileTransactionCount,
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

/** 업로드 응답 타입 */
interface UploadResponse {
  success: boolean;
  message: string;
  results: {
    fileName: string;
    displayName: string;
    sourceType: string;
    parsed: number;
    inserted: number;
    duplicates: number;
    error?: string;
    error_code?: string;
  }[];
  totalInserted: number;
  totalDuplicates: number;
}


export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const owner = (formData.get('owner') as Owner) || 'husband';
    const password = formData.get('password') as string | null;

    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, message: '파일이 없습니다.' },
        { status: 400 }
      );
    }

    if (owner !== 'husband' && owner !== 'wife') {
      return NextResponse.json(
        { success: false, message: 'owner는 husband 또는 wife여야 합니다.' },
        { status: 400 }
      );
    }

    const results: UploadResponse['results'] = [];
    let totalInserted = 0;
    let totalDuplicates = 0;

    for (const file of files) {
      const fileName = file.name;

      try {
        const buffer = await file.arrayBuffer();

        // 파일 내용을 base64로 인코딩 (다운로드용)
        const fileContentBase64 = Buffer.from(buffer).toString('base64');

        const parseResult = await parseFile(buffer, {
          fileName,
          owner,
          password: password || undefined,
        });

        if (!parseResult.success) {
          results.push({
            fileName,
            displayName: fileName,
            sourceType: parseResult.source_type,
            parsed: 0,
            inserted: 0,
            duplicates: 0,
            error: parseResult.error,
            error_code: parseResult.error_code,
          });
          continue;
        }

        // 직접입력 파일 처리 (별도 로직)
        if (parseResult.source_type === '직접입력') {
          const ownerName = OWNER_NAMES[owner];
          const displayName = `${ownerName}_직접입력.xlsx`;

          // 직접입력은 파일 레코드 생성 없이 거래만 저장
          const transactionsToInsert: CreateTransactionDto[] = buildManualTransactions(
            parseResult.data,
            owner
          );

          const insertResult = await createManualEntries(transactionsToInsert);

          if (insertResult.error) {
            results.push({
              fileName,
              displayName,
              sourceType: '직접입력',
              parsed: parseResult.data.length,
              inserted: 0,
              duplicates: 0,
              error: insertResult.error,
            });
            continue;
          }

          const { inserted, duplicates } = insertResult.data!;

          // 히스토리 기록
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

          totalInserted += inserted;
          totalDuplicates += duplicates;

          results.push({
            fileName,
            displayName,
            sourceType: '직접입력',
            parsed: parseResult.data.length,
            inserted,
            duplicates,
          });
          continue;
        }

        // 청구월 추출 (거래 내역 기준 최신 월 우선, 없으면 파일명에서 추출)
        // 10-11월 내용이 있으면 11월이 되어야 함
        const billingMonth =
          extractBillingMonthFromTransactions(parseResult.data) ||
          extractBillingMonthFromFilename(fileName);

        // 표시용 파일 이름 생성
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
          billing_total: parseResult.billing_total, // 이용대금명세서상의 청구 총액
          file_content: fileContentBase64, // 다운로드용 파일 내용
        });

        if (fileResult.error || !fileResult.data) {
          results.push({
            fileName,
            displayName,
            sourceType: parseResult.source_type,
            parsed: parseResult.data.length,
            inserted: 0,
            duplicates: 0,
            error: fileResult.error || '파일 정보 저장 실패',
          });
          continue;
        }

        const fileId = fileResult.data.id;

        // 이용처명 매핑 적용
        const mappedData = await applyMerchantNameMappings(parseResult.data);

        // AI 카테고리 분류 준비 (전체 분류)
        const prep = prepareClassificationInputs(mappedData, 'all');
        const { expenseInputs, incomeInputs, installmentIndices } = prep;

        // 지출/소득 각각 분류
        let categoryMap: Map<number, Category> = new Map();
        try {
          let expenseMap: Map<number, Category> = new Map();
          let incomeMap: Map<number, Category> = new Map();

          if (expenseInputs.length > 0) {
            expenseMap = await classifyTransactions(expenseInputs);
          }
          if (incomeInputs.length > 0) {
            incomeMap = await classifyIncomeTransactions(incomeInputs);
          }

          categoryMap = mergeCategoryMaps(expenseMap, incomeMap);
        } catch (error) {
          console.error('AI 분류 실패, 기본 카테고리 사용:', error);
        }

        // DB에 저장할 데이터 준비 (file_id 포함)
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

        // DB에 저장
        const insertResult = await createTransactionsWithFileId(transactionsToInsert);

        if (insertResult.error) {
          results.push({
            fileName,
            displayName,
            sourceType: parseResult.source_type,
            parsed: parseResult.data.length,
            inserted: 0,
            duplicates: 0,
            error: insertResult.error,
          });
          continue;
        }

        const { inserted, duplicates } = insertResult.data!;

        // 파일의 실제 거래 건수 업데이트
        await updateFileTransactionCount(fileId, inserted);

        // 히스토리 기록
        if (inserted > 0) {
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
        }

        totalInserted += inserted;
        totalDuplicates += duplicates;

        results.push({
          fileName,
          displayName,
          sourceType: parseResult.source_type,
          parsed: parseResult.data.length,
          inserted,
          duplicates,
        });
      } catch (err) {
        results.push({
          fileName,
          displayName: fileName,
          sourceType: '기타',
          parsed: 0,
          inserted: 0,
          duplicates: 0,
          error: String(err),
        });
      }
    }

    const response: UploadResponse = {
      success: true,
      message: `${files.length}개 파일 처리 완료: ${totalInserted}건 추가, ${totalDuplicates}건 중복`,
      results,
      totalInserted,
      totalDuplicates,
    };

    return NextResponse.json(response);
  } catch (err) {
    return NextResponse.json(
      { success: false, message: `서버 오류: ${String(err)}` },
      { status: 500 }
    );
  }
}
