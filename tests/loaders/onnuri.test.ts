/**
 * 온누리상품권 파서 테스트
 */

import { describe, it, expect } from 'vitest';
import { OnnuriParser } from '@/lib/loaders/onnuri';

describe('OnnuriParser', () => {
  const parser = new OnnuriParser();

  describe('canParse', () => {
    it('파일명에 "온누리"가 포함되면 인식', () => {
      expect(parser.canParse('온누리_결제내역.xlsx', [])).toBe(true);
    });

    it('파일명에 "onnuri"가 포함되면 인식 (대소문자 무관)', () => {
      expect(parser.canParse('ONNURI_payment.xlsx', [])).toBe(true);
    });

    it('헤더에 식별 키워드가 있으면 인식', () => {
      const headers = ['거래일자', '거래시각', '가맹점 및 상품권명', '거래금액'];
      expect(parser.canParse('결제내역.xlsx', headers)).toBe(true);
    });

    it('일부 키워드만 있으면 인식 불가', () => {
      const headers = ['거래일자', '가맹점명', '금액'];
      expect(parser.canParse('결제내역.xlsx', headers)).toBe(false);
    });
  });

  describe('parse', () => {
    it('기본 거래 데이터 파싱', () => {
      const data = [
        ['거래일자', '거래시각', '거래구분', '가맹점 및 상품권명', '사업자번호', '거래방식', '거래유형', '거래상태', '거래금액'],
        ['20251008', '173352', '결제', '다농산업(주)', '2158103379', 'QR결제', '단일결제', '결제완료', '30290'],
        ['20251029', '154739', '결제', '스마트홈', '5622000054', '카드결제', '단일결제', '결제완료', '5000'],
      ];

      const result = parser.parse([data], '결제내역.xlsx');

      expect(result.success).toBe(true);
      expect(result.data.length).toBe(2);
      expect(result.source_type).toBe('온누리');
      expect(result.total_amount).toBe(35290);
    });

    it('날짜 형식 변환 확인 (YYYYMMDD -> YYYY-MM-DD)', () => {
      const data = [
        ['거래일자', '거래시각', '거래구분', '가맹점 및 상품권명', '사업자번호', '거래방식', '거래유형', '거래상태', '거래금액'],
        ['20251225', '115821', '결제', '혜성유통', '1539101602', '카드결제', '단일결제', '결제완료', '10000'],
      ];

      const result = parser.parse([data], '결제내역.xlsx');

      expect(result.data[0].date).toBe('2025-12-25');
    });

    it('결제완료가 아닌 거래는 제외', () => {
      const data = [
        ['거래일자', '거래시각', '거래구분', '가맹점 및 상품권명', '사업자번호', '거래방식', '거래유형', '거래상태', '거래금액'],
        ['20251008', '173352', '결제', '다농산업(주)', '2158103379', 'QR결제', '단일결제', '결제완료', '30290'],
        ['20251009', '100000', '결제', '취소된가게', '1234567890', 'QR결제', '단일결제', '결제취소', '10000'],
      ];

      const result = parser.parse([data], '결제내역.xlsx');

      expect(result.data.length).toBe(1);
      expect(result.data[0].merchant).toBe('다농산업(주)');
    });

    it('금액 0 이하인 거래는 제외', () => {
      const data = [
        ['거래일자', '거래시각', '거래구분', '가맹점 및 상품권명', '사업자번호', '거래방식', '거래유형', '거래상태', '거래금액'],
        ['20251008', '173352', '결제', '다농산업(주)', '2158103379', 'QR결제', '단일결제', '결제완료', '30290'],
        ['20251009', '100000', '결제', '무료가게', '1234567890', 'QR결제', '단일결제', '결제완료', '0'],
      ];

      const result = parser.parse([data], '결제내역.xlsx');

      expect(result.data.length).toBe(1);
    });

    it('상품권은 할부 없음 (is_installment 항상 false)', () => {
      const data = [
        ['거래일자', '거래시각', '거래구분', '가맹점 및 상품권명', '사업자번호', '거래방식', '거래유형', '거래상태', '거래금액'],
        ['20251008', '173352', '결제', '다농산업(주)', '2158103379', 'QR결제', '단일결제', '결제완료', '30290'],
      ];

      const result = parser.parse([data], '결제내역.xlsx');

      expect(result.data[0].is_installment).toBe(false);
    });

    it('데이터가 없으면 에러 반환', () => {
      const result = parser.parse([[]], '결제내역.xlsx');

      expect(result.success).toBe(false);
      expect(result.error).toContain('데이터가 없습니다');
    });

    it('헤더를 찾을 수 없으면 에러 반환', () => {
      const data = [
        ['잘못된', '헤더', '형식'],
        ['20251008', '173352', '결제'],
      ];

      const result = parser.parse([data], '결제내역.xlsx');

      expect(result.success).toBe(false);
      expect(result.error).toContain('헤더를 찾을 수 없습니다');
    });
  });
});
