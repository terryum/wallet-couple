import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import { SamsungParser } from '@/lib/loaders/samsung';
import type { ExcelRow } from '@/lib/loaders/types';

describe('SamsungParser', () => {
  let parser: SamsungParser;
  let sampleData: ExcelRow[][];

  beforeAll(() => {
    parser = new SamsungParser();

    // Load sample file
    const samplePath = path.join(
      process.cwd(),
      'sample-data',
      'samsungcard_20251025.xlsx'
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
    it('should return true for samsungcard filename', () => {
      const headers = ['이용일', '가맹점', '원금'];
      expect(parser.canParse('samsungcard_20251025.xlsx', headers)).toBe(true);
    });

    it('should return true when headers contain 가맹점 and 일시불합계', () => {
      const headers = ['이용일', '가맹점', '원금', '일시불합계'];
      expect(parser.canParse('unknown.xlsx', headers)).toBe(true);
    });

    it('should return false for hyundai card file', () => {
      const headers = ['이용일', '결제원금', '할부/회차'];
      expect(parser.canParse('hyundaicard.xls', headers)).toBe(false);
    });
  });

  describe('parse', () => {
    it('should parse sample data successfully', () => {
      if (!sampleData) {
        console.log('Sample data not available, skipping test');
        return;
      }

      const result = parser.parse(sampleData, 'samsungcard_20251025.xlsx');

      expect(result.success).toBe(true);
      expect(result.source_type).toBe('삼성카드');
      expect(result.data.length).toBeGreaterThan(0);
    });

    it('should parse date in YYYY-MM-DD format', () => {
      if (!sampleData) return;

      const result = parser.parse(sampleData, 'samsungcard.xlsx');

      if (result.data.length > 0) {
        const firstItem = result.data[0];
        expect(firstItem.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    });

    it('should have positive amounts only', () => {
      if (!sampleData) return;

      const result = parser.parse(sampleData, 'samsungcard.xlsx');

      result.data.forEach((item) => {
        expect(item.amount).toBeGreaterThan(0);
      });
    });

    it('should calculate total amount correctly', () => {
      if (!sampleData) return;

      const result = parser.parse(sampleData, 'samsungcard.xlsx');

      const calculatedTotal = result.data.reduce(
        (sum, item) => sum + item.amount,
        0
      );
      expect(result.total_amount).toBe(calculatedTotal);
    });
  });
});
