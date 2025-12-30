import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import { LotteParser } from '@/lib/loaders/lotte';
import type { ExcelRow } from '@/lib/loaders/types';

describe('LotteParser', () => {
  let parser: LotteParser;
  let sampleData: ExcelRow[][];

  beforeAll(() => {
    parser = new LotteParser();

    // Load sample file
    const samplePath = path.join(
      process.cwd(),
      'sample-data',
      '이용대금명세서_2509(신용.체크)_20251218230959.xls'
    );

    if (fs.existsSync(samplePath)) {
      const buffer = fs.readFileSync(samplePath);
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      sampleData = workbook.SheetNames.map((name) => {
        const sheet = workbook.Sheets[name];
        return XLSX.utils.sheet_to_json<ExcelRow>(sheet, {
          header: 1,
          defval: '',
        });
      });
    }
  });

  describe('canParse', () => {
    it('should return true for 이용대금명세서 filename', () => {
      const headers = ['이용일', '이용가맹점', '원금'];
      expect(
        parser.canParse('이용대금명세서_2509(신용.체크).xls', headers)
      ).toBe(true);
    });

    it('should return true for lotte in filename', () => {
      const headers = ['이용일', '이용가맹점', '원금'];
      expect(parser.canParse('lotte_card.xlsx', headers)).toBe(true);
    });

    it('should return false for samsung card file', () => {
      const headers = ['이용일', '가맹점', '원금', '일시불합계'];
      expect(parser.canParse('samsungcard.xlsx', headers)).toBe(false);
    });
  });

  describe('parse', () => {
    it('should parse sample data successfully', () => {
      if (!sampleData) {
        console.log('Sample data not available, skipping test');
        return;
      }

      const result = parser.parse(sampleData, '이용대금명세서.xls');

      expect(result.success).toBe(true);
      expect(result.source_type).toBe('롯데카드');
      expect(result.data.length).toBeGreaterThan(0);
    });

    it('should parse Excel serial date to YYYY-MM-DD format', () => {
      if (!sampleData) return;

      const result = parser.parse(sampleData, '이용대금명세서.xls');

      if (result.data.length > 0) {
        const firstItem = result.data[0];
        expect(firstItem.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    });

    it('should have positive amounts only', () => {
      if (!sampleData) return;

      const result = parser.parse(sampleData, '이용대금명세서.xls');

      result.data.forEach((item) => {
        expect(item.amount).toBeGreaterThan(0);
      });
    });

    it('should identify installment transactions', () => {
      if (!sampleData) return;

      const result = parser.parse(sampleData, '이용대금명세서.xls');

      const installmentItems = result.data.filter(
        (item) => item.category === '기존할부'
      );

      // 롯데카드 샘플에 할부 거래가 있음
      expect(installmentItems.length).toBeGreaterThan(0);

      installmentItems.forEach((item) => {
        expect(item.is_installment).toBe(true);
      });
    });
  });
});
