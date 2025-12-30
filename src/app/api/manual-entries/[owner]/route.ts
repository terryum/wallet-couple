/**
 * GET /api/manual-entries/[owner]
 * 직접입력 내역을 엑셀 파일로 다운로드
 * 데이터 유효성 검사 포함 (카테고리 드롭다운, 금액 숫자, 날짜 형식)
 */

import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { getManualEntries } from '@/lib/supabase/queries';
import { MANUAL_ENTRY_HEADERS } from '@/lib/loaders/manual';
import { ALL_CATEGORIES } from '@/types';
import type { Owner } from '@/types';

interface RouteContext {
  params: Promise<{ owner: string }>;
}

const OWNER_NAMES: Record<Owner, string> = {
  husband: '남편',
  wife: '아내',
};

export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const { owner } = await context.params;

    if (owner !== 'husband' && owner !== 'wife') {
      return NextResponse.json(
        { success: false, message: 'owner는 husband 또는 wife여야 합니다.' },
        { status: 400 }
      );
    }

    // 직접입력 내역 조회
    const result = await getManualEntries(owner as Owner);

    if (result.error) {
      return NextResponse.json(
        { success: false, message: result.error },
        { status: 500 }
      );
    }

    const transactions = result.data || [];

    // 워크북 생성
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Wallet Card Dashboard';
    workbook.created = new Date();

    // 메인 시트 생성
    const worksheet = workbook.addWorksheet('직접입력', {
      views: [{ state: 'frozen', ySplit: 1 }], // 첫 행 고정
    });

    // 컬럼 설정
    worksheet.columns = [
      { header: MANUAL_ENTRY_HEADERS[0], key: 'date', width: 14 },
      { header: MANUAL_ENTRY_HEADERS[1], key: 'merchant', width: 30 },
      { header: MANUAL_ENTRY_HEADERS[2], key: 'amount', width: 14 },
      { header: MANUAL_ENTRY_HEADERS[3], key: 'category', width: 16 },
      { header: MANUAL_ENTRY_HEADERS[4], key: 'memo', width: 25 },
    ];

    // 헤더 스타일 적용
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE2E8F0' }, // slate-200
    };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };

    // 기존 거래 데이터 추가
    for (const tx of transactions) {
      worksheet.addRow({
        date: tx.transaction_date,
        merchant: tx.merchant_name,
        amount: tx.amount,
        category: tx.category,
        memo: tx.memo || '',
      });
    }

    // 최소 100개 행까지 데이터 유효성 검사 적용
    const minRows = 100;
    const startRow = 2; // 헤더 다음 행부터

    // 쉼표로 구분된 카테고리 목록 (따옴표로 감싸서 Excel 형식에 맞게)
    const categoryFormula = `"${ALL_CATEGORIES.join(',')}"`;

    for (let row = startRow; row <= minRows; row++) {
      // 날짜 컬럼 (A열) - 날짜 유효성 검사
      const dateCell = worksheet.getCell(`A${row}`);
      dateCell.dataValidation = {
        type: 'date',
        operator: 'between',
        showErrorMessage: true,
        errorTitle: '날짜 오류',
        error: 'YYYY-MM-DD 형식의 날짜를 입력해주세요. (예: 2025-01-15)',
        showInputMessage: true,
        promptTitle: '날짜 입력',
        prompt: 'YYYY-MM-DD 형식으로 입력\n예: 2025-01-15',
        formulae: [new Date('2020-01-01'), new Date('2030-12-31')],
      };

      // 금액 컬럼 (C열) - 양의 정수 유효성 검사
      const amountCell = worksheet.getCell(`C${row}`);
      amountCell.dataValidation = {
        type: 'whole',
        operator: 'greaterThan',
        showErrorMessage: true,
        errorTitle: '금액 오류',
        error: '0보다 큰 정수를 입력해주세요. (예: 15000)',
        showInputMessage: true,
        promptTitle: '금액 입력',
        prompt: '숫자만 입력 (원 단위)\n예: 15000',
        formulae: [0],
      };

      // 카테고리 컬럼 (D열) - 드롭다운 리스트
      const categoryCell = worksheet.getCell(`D${row}`);
      categoryCell.dataValidation = {
        type: 'list',
        allowBlank: true,
        showErrorMessage: true,
        errorTitle: '카테고리 오류',
        error: '목록에서 카테고리를 선택해주세요.',
        showInputMessage: true,
        promptTitle: '카테고리 선택',
        prompt: '드롭다운에서 선택하세요',
        formulae: [categoryFormula],
      };
    }

    // 금액 열 숫자 서식 적용
    worksheet.getColumn('amount').numFmt = '#,##0';
    worksheet.getColumn('amount').alignment = { horizontal: 'right' };

    // 카테고리 목록 시트 추가 (참조용)
    const categorySheet = workbook.addWorksheet('카테고리목록');
    categorySheet.columns = [{ header: '카테고리 목록', key: 'category', width: 18 }];

    const catHeaderRow = categorySheet.getRow(1);
    catHeaderRow.font = { bold: true };
    catHeaderRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE2E8F0' },
    };

    for (const cat of ALL_CATEGORIES) {
      categorySheet.addRow({ category: cat });
    }

    // 엑셀 파일을 버퍼로 변환
    const buffer = await workbook.xlsx.writeBuffer();

    // 파일명 생성
    const ownerName = OWNER_NAMES[owner as Owner];
    const filename = `${ownerName}_직접입력.xlsx`;
    const encodedFilename = encodeURIComponent(filename);

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${encodedFilename}"`,
        'Content-Length': buffer.byteLength.toString(),
      },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: `서버 오류: ${String(err)}` },
      { status: 500 }
    );
  }
}
