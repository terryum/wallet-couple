import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import { KBParser } from '@/lib/loaders/kb';
import type { ExcelRow } from '@/lib/loaders/types';

describe('KBParser', () => {
  let parser: KBParser;
  let sampleData: ExcelRow[][];

  beforeAll(() => {
    parser = new KBParser();

    // Load sample file
    const samplePath = path.join(
      process.cwd(),
      'sample-data',
      '202509_usage (1).xlsx'
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
    it('should return true for KB in filename', () => {
      const headers = ['이용일자', '이용하신 가맹점', '회차'];
      expect(parser.canParse('KB_usage.xlsx', headers)).toBe(true);
    });

    it('should return true when headers contain 이용하신 가맹점', () => {
      const headers = ['이용일자', '이용카드', '이용하신 가맹점', '회차'];
      expect(parser.canParse('202509_usage.xlsx', headers)).toBe(true);
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

      const result = parser.parse(sampleData, '202509_usage.xlsx');

      expect(result.success).toBe(true);
      expect(result.source_type).toBe('KB국민카드');
      expect(result.data.length).toBeGreaterThan(0);
    });

    it('should parse YY.MM.DD date to YYYY-MM-DD format', () => {
      if (!sampleData) return;

      const result = parser.parse(sampleData, '202509_usage.xlsx');

      if (result.data.length > 0) {
        const firstItem = result.data[0];
        expect(firstItem.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    });

    it('should have positive amounts only', () => {
      if (!sampleData) return;

      const result = parser.parse(sampleData, '202509_usage.xlsx');

      result.data.forEach((item) => {
        expect(item.amount).toBeGreaterThan(0);
      });
    });

    it('should calculate total amount correctly', () => {
      if (!sampleData) return;

      const result = parser.parse(sampleData, '202509_usage.xlsx');

      const calculatedTotal = result.data.reduce(
        (sum, item) => sum + item.amount,
        0
      );
      expect(result.total_amount).toBe(calculatedTotal);
    });

    it('should identify installment transactions', () => {
      if (!sampleData) return;

      const result = parser.parse(sampleData, '202509_usage.xlsx');

      // 할부 항목 확인
      const installmentItems = result.data.filter(
        (item) => item.is_installment
      );

      installmentItems.forEach((item) => {
        expect(item.category).toBe('기존할부');
      });
    });
  });
});
