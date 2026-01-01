import { describe, expect, it } from 'vitest';
import { getPasswordPattern, getSourceDisplayName } from '@/lib/upload/filePatterns';

describe('upload/filePatterns', () => {
  it('detects source display names', () => {
    expect(getSourceDisplayName('현대카드_명세서.xls')).toBe('현대카드 명세서');
    expect(getSourceDisplayName('samsung_card.xlsx')).toBe('삼성카드 명세서');
    expect(getSourceDisplayName('우리은행_거래내역.xls')).toBe('우리은행 거래내역');
    expect(getSourceDisplayName('onnuri.csv')).toBe('온누리상품권');
  });

  it('detects password pattern', () => {
    expect(getPasswordPattern('chak_export.xlsx')).toBe('chak');
    expect(getPasswordPattern('other.xlsx')).toBeNull();
  });
});
