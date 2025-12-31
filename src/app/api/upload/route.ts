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
  createActionHistory,
  createManualEntries,
} from '@/lib/supabase/queries';
import { classifyTransactions, classifyIncomeTransactions, applyMerchantNameMappings, type ClassifyInput } from '@/lib/classifier';
import type { CreateTransactionDto, Owner, ParsedTransaction, Category } from '@/types';

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

/**
 * 파일 이름에서 청구월 추출 시도
 */
function extractBillingMonthFromFilename(filename: string): string | null {
  // 패턴: 202512, 2025-12, 2025_12, 12월 등
  const patterns = [
    /(\d{4})(\d{2})/, // 202512
    /(\d{4})[-_](\d{2})/, // 2025-12, 2025_12
    /(\d{4})년\s*(\d{1,2})월/, // 2025년 12월
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
 * 거래 내역에서 청구월 추출 (일반 거래의 가장 최근 월)
 * 기존할부는 제외 (오래된 이용일을 가지고 있어서 잘못된 결과 초래)
 */
function extractBillingMonthFromTransactions(transactions: ParsedTransaction[]): string | null {
  if (transactions.length === 0) return null;

  // 기존할부가 아닌 일반 거래만 필터링
  const normalTransactions = transactions.filter(t => !t.is_installment);

  const dates = normalTransactions
    .map(t => t.date)
    .filter(d => d)
    .sort()
    .reverse();

  if (dates.length === 0) return null;

  // 가장 최근 날짜의 년월 반환
  const latestDate = dates[0];
  return latestDate.substring(0, 7); // YYYY-MM
}

/**
 * 표시용 파일 이름 생성
 * 예: "2025년_12월_남편_현대카드.xls"
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

  // 청구월을 알 수 없는 경우
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return `${year}년_${month}월_${ownerName}_${sourceName}.${ext}`;
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
          const transactionsToInsert: CreateTransactionDto[] = parseResult.data.map((item) => ({
            transaction_date: item.date,
            merchant_name: item.merchant,
            amount: item.amount,
            category: item.category, // 엑셀에서 가져온 카테고리 그대로 사용
            source_type: '직접입력',
            owner,
            raw_data: { original: item },
          }));

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

        // AI 카테고리 분류 - 지출/소득 분리 처리
        const expenseInputs: ClassifyInput[] = [];
        const incomeInputs: ClassifyInput[] = [];
        const installmentIndices = new Set<number>();

        mappedData.forEach((item, idx) => {
          if (item.is_installment === true || item.category === '기존할부') {
            installmentIndices.add(idx);
          } else if (item.transaction_type === 'income') {
            // 소득 거래
            incomeInputs.push({
              index: idx,
              merchant: item.merchant,
              amount: item.amount,
            });
          } else {
            // 지출 거래 (기본값)
            expenseInputs.push({
              index: idx,
              merchant: item.merchant,
              amount: item.amount,
            });
          }
        });

        // 지출/소득 각각 분류
        let categoryMap: Map<number, Category> = new Map();
        try {
          // 지출 분류
          if (expenseInputs.length > 0) {
            const expenseResults = await classifyTransactions(expenseInputs);
            expenseResults.forEach((cat, idx) => categoryMap.set(idx, cat));
          }
          // 소득 분류
          if (incomeInputs.length > 0) {
            const incomeResults = await classifyIncomeTransactions(incomeInputs);
            incomeResults.forEach((cat, idx) => categoryMap.set(idx, cat));
          }
        } catch (error) {
          console.error('AI 분류 실패, 기본 카테고리 사용:', error);
        }

        // 기존할부 거래의 날짜를 해당 월의 25일로 설정하기 위한 함수
        const getInstallmentDate = (originalDate: string, targetMonth: string | null): string => {
          if (targetMonth) {
            // billing month가 있으면 해당 월의 25일
            return `${targetMonth}-25`;
          }
          // billing month가 없으면 원본 날짜의 월 기준 25일
          return `${originalDate.substring(0, 7)}-25`;
        };

        // DB에 저장할 데이터 준비 (file_id 포함)
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
