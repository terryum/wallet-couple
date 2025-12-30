import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import { HyundaiParser } from '@/lib/loaders/hyundai';
import type { ExcelRow } from '@/lib/loaders/types';

describe('HyundaiParser', () => {
  let parser: HyundaiParser;
  let sampleData: ExcelRow[][];

  beforeAll(() => {
    parser = new HyundaiParser();

    // Load sample file
    const samplePath = path.join(
      process.cwd(),
      'sample-data',
      'hyundaicard_20251218 (1).xls'
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
    it('should return true for hyundaicard filename', () => {
      const headers = ['이용일', '결제원금', '할부/회차'];
      expect(parser.canParse('hyundaicard_20251218.xls', headers)).toBe(true);
    });

    it('should return true when headers contain 결제원금 and 할부/회차', () => {
      const headers = ['이용일', '이용가맹점', '결제원금', '할부/회차'];
      expect(parser.canParse('unknown.xlsx', headers)).toBe(true);
    });

    it('should return false for samsung card file', () => {
      const headers = ['이용일', '가맹점', '원금', '일시불합계'];
      expect(parser.canParse('samsungcard.xlsx', headers)).toBe(false);
    });

    it('should return false when headers do not match', () => {
      const headers = ['date', 'merchant', 'amount'];
      expect(parser.canParse('random.xlsx', headers)).toBe(false);
    });
  });

  describe('parse', () => {
    it('should parse sample data successfully', () => {
      if (!sampleData) {
        console.log('Sample data not available, skipping test');
        return;
      }

      const result = parser.parse(sampleData, 'hyundaicard_20251218 (1).xls');

      expect(result.success).toBe(true);
      expect(result.source_type).toBe('현대카드');
      expect(result.data.length).toBeGreaterThan(0);
    });

    it('should parse date in YYYY-MM-DD format', () => {
      if (!sampleData) return;

      const result = parser.parse(sampleData, 'hyundaicard.xls');

      if (result.data.length > 0) {
        const firstItem = result.data[0];
        expect(firstItem.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    });

    it('should extract merchant name correctly', () => {
      if (!sampleData) return;

      const result = parser.parse(sampleData, 'hyundaicard.xls');

      if (result.data.length > 0) {
        const firstItem = result.data[0];
        expect(firstItem.merchant).toBeTruthy();
        expect(typeof firstItem.merchant).toBe('string');
      }
    });

    it('should have positive amounts only', () => {
      if (!sampleData) return;

      const result = parser.parse(sampleData, 'hyundaicard.xls');

      result.data.forEach((item) => {
        expect(item.amount).toBeGreaterThan(0);
      });
    });

    it('should identify installment transactions', () => {
      if (!sampleData) return;

      const result = parser.parse(sampleData, 'hyundaicard.xls');

      // 기존할부 카테고리가 있는 항목은 is_installment가 true
      const installmentItems = result.data.filter(
        (item) => item.category === '기존할부'
      );
      installmentItems.forEach((item) => {
        expect(item.is_installment).toBe(true);
      });
    });

    it('should calculate total amount correctly', () => {
      if (!sampleData) return;

      const result = parser.parse(sampleData, 'hyundaicard.xls');

      const calculatedTotal = result.data.reduce(
        (sum, item) => sum + item.amount,
        0
      );
      expect(result.total_amount).toBe(calculatedTotal);
    });
  });

  describe('date parsing', () => {
    it('should parse "2025년 08월 14일" format', () => {
      const date = parser.parseHyundaiDate('2025년 08월 14일');
      expect(date).toBe('2025-08-14');
    });

    it('should parse "2025년 8월 4일" format (single digit)', () => {
      const date = parser.parseHyundaiDate('2025년 8월 4일');
      expect(date).toBe('2025-08-04');
    });

    it('should return null for invalid date', () => {
      const date = parser.parseHyundaiDate('invalid date');
      expect(date).toBeNull();
    });
  });

  describe('merchant name extraction', () => {
    it('should extract merchant name with amount suffix', () => {
      const merchant = parser.extractMerchantName('우지커피판교w시티점3,300');
      expect(merchant).toBe('우지커피판교w시티점');
    });

    it('should handle merchant name without amount', () => {
      const merchant = parser.extractMerchantName('스타벅스 강남점');
      expect(merchant).toBe('스타벅스 강남점');
    });

    it('should handle truncated merchant names', () => {
      const merchant = parser.extractMerchantName(
        '신성통상TOPTEN판교알파돔19,90...'
      );
      expect(merchant).toBe('신성통상TOPTEN판교알파돔');
    });
  });
});
