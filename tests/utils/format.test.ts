import { describe, it, expect } from 'vitest';
import {
  formatNumber,
  formatCurrency,
  formatDate,
  formatShortDate,
  normalizeDate,
} from '@/lib/utils/format';

describe('formatNumber', () => {
  it('should format number with thousand separators', () => {
    expect(formatNumber(1234567)).toBe('1,234,567');
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(999)).toBe('999');
  });
});

describe('formatCurrency', () => {
  it('should format amount with 원 suffix', () => {
    expect(formatCurrency(50000)).toBe('50,000원');
    expect(formatCurrency(1234567)).toBe('1,234,567원');
  });
});

describe('formatDate', () => {
  it('should format Date object to YYYY-MM-DD', () => {
    const date = new Date(2025, 11, 26); // Month is 0-indexed
    expect(formatDate(date)).toBe('2025-12-26');
  });

  it('should format date string to YYYY-MM-DD', () => {
    expect(formatDate('2025-12-26')).toBe('2025-12-26');
  });
});

describe('formatShortDate', () => {
  it('should format date to MM.DD', () => {
    expect(formatShortDate('2025-12-26')).toBe('12.26');
    expect(formatShortDate('2025-01-05')).toBe('01.05');
  });
});

describe('normalizeDate', () => {
  it('should return YYYY-MM-DD as is', () => {
    expect(normalizeDate('2025-12-26')).toBe('2025-12-26');
  });

  it('should convert YYYY/MM/DD to YYYY-MM-DD', () => {
    expect(normalizeDate('2025/12/26')).toBe('2025-12-26');
    expect(normalizeDate('2025/1/5')).toBe('2025-01-05');
  });

  it('should convert YYYY.MM.DD to YYYY-MM-DD', () => {
    expect(normalizeDate('2025.12.26')).toBe('2025-12-26');
  });

  it('should convert YYYYMMDD to YYYY-MM-DD', () => {
    expect(normalizeDate('20251226')).toBe('2025-12-26');
  });

  it('should return null for invalid format', () => {
    expect(normalizeDate('invalid')).toBe(null);
    expect(normalizeDate('')).toBe(null);
  });
});
