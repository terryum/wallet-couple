/**
 * 성남사랑상품권 파서 테스트
 */

import { describe, it, expect } from 'vitest';
import { SeongnamParser } from '@/lib/loaders/seongnam';

describe('SeongnamParser', () => {
  const parser = new SeongnamParser();

  describe('canParse', () => {
    it('파일명에 "chak"이 포함되면 인식', () => {
      expect(parser.canParse('chak_이용내역_결제_20251230.xlsx', [])).toBe(true);
    });

    it('파일명에 "성남사랑"이 포함되면 인식', () => {
      expect(parser.canParse('성남사랑_결제내역.xlsx', [])).toBe(true);
    });

    it('파일명에 "seongnam"이 포함되면 인식 (대소문자 무관)', () => {
      expect(parser.canParse('SEONGNAM_payment.xlsx', [])).toBe(true);
    });

    it('헤더에 식별 키워드가 있으면 인식', () => {
      const headers = ['거래일시', '사용처', '거래금액'];
      expect(parser.canParse('결제내역.xlsx', headers)).toBe(true);
    });

    it('일부 키워드만 있으면 인식 불가', () => {
      const headers = ['거래일시', '가맹점명', '금액'];
      expect(parser.canParse('결제내역.xlsx', headers)).toBe(false);
    });
  });

  describe('parse', () => {
    // 성남사랑상품권 실제 파일 구조를 반영한 테스트 데이터
    // 헤더 전에 메타 정보가 있고, 헤더가 두 줄로 구성됨
    const createFullData = (transactions: unknown[][]) => {
      return [
        ['지역상품권 거래내역', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        ['회원명', '', '테스트', '조회기간', '', '2025-10-01~2025-10-31', '', '', '', '', '', '', '', ''],
        ['휴대폰번호', '', '010-1234-5678', '요청일시', '', '2025-12-30 07:39:27', '', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        ['참고용 안내 메시지', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        // 헤더 행 (index 7)
        ['순번', '상품권명', '거래일시', '거래구분', '거래방법', '사용처', '거래금액', '잔고', '현금영수증', '', '', '', '', '비고'],
        // 서브헤더 (index 8)
        ['', '', '', '', '', '', '', '', '발급일시', '발급용도', '발급번호', '승인번호', '발급상태', ''],
        // 데이터 행 (index 9+)
        ...transactions,
      ];
    };

    it('기본 거래 데이터 파싱', () => {
      const data = createFullData([
        [1, '성남사랑상품권', '2025-10-30 16:09:03', '결제완료', '가맹점 STAND QR', '파츠커피', '4,100', '1,378,160', '', '', '', '', '', ''],
        [2, '성남사랑상품권', '2025-10-29 18:21:30', '결제완료', '가맹점 STAND QR', '나무사이로', '11,600', '1,382,260', '', '', '', '', '', ''],
      ]);

      const result = parser.parse([data], 'chak_이용내역.xlsx');

      expect(result.success).toBe(true);
      expect(result.data.length).toBe(2);
      expect(result.source_type).toBe('성남사랑');
      expect(result.total_amount).toBe(15700); // 4100 + 11600
    });

    it('날짜 형식 변환 확인 (YYYY-MM-DD HH:MM:SS -> YYYY-MM-DD)', () => {
      const data = createFullData([
        [1, '성남사랑상품권', '2025-10-30 16:09:03', '결제완료', '가맹점 STAND QR', '파츠커피', '4,100', '1,378,160', '', '', '', '', '', ''],
      ]);

      const result = parser.parse([data], 'chak_이용내역.xlsx');

      expect(result.data[0].date).toBe('2025-10-30');
    });

    it('가맹점명 추출 확인', () => {
      const data = createFullData([
        [1, '성남사랑상품권', '2025-10-30 16:09:03', '결제완료', '가맹점 STAND QR', '성남농협 하나로마트 대왕점', '17,630', '1,446,970', '', '', '', '', '', ''],
      ]);

      const result = parser.parse([data], 'chak_이용내역.xlsx');

      expect(result.data[0].merchant).toBe('성남농협 하나로마트 대왕점');
    });

    it('결제완료가 아닌 거래는 제외', () => {
      const data = createFullData([
        [1, '성남사랑상품권', '2025-10-30 16:09:03', '결제완료', '가맹점 STAND QR', '파츠커피', '4,100', '1,378,160', '', '', '', '', '', ''],
        [2, '성남사랑상품권', '2025-10-29 18:21:30', '결제취소', '가맹점 STAND QR', '취소된가게', '11,600', '1,382,260', '', '', '', '', '', ''],
      ]);

      const result = parser.parse([data], 'chak_이용내역.xlsx');

      expect(result.data.length).toBe(1);
      expect(result.data[0].merchant).toBe('파츠커피');
    });

    it('금액 0 이하인 거래는 제외', () => {
      const data = createFullData([
        [1, '성남사랑상품권', '2025-10-30 16:09:03', '결제완료', '가맹점 STAND QR', '파츠커피', '4,100', '1,378,160', '', '', '', '', '', ''],
        [2, '성남사랑상품권', '2025-10-29 18:21:30', '결제완료', '가맹점 STAND QR', '무료가게', '0', '1,382,260', '', '', '', '', '', ''],
      ]);

      const result = parser.parse([data], 'chak_이용내역.xlsx');

      expect(result.data.length).toBe(1);
    });

    it('상품권은 할부 없음 (is_installment 항상 false)', () => {
      const data = createFullData([
        [1, '성남사랑상품권', '2025-10-30 16:09:03', '결제완료', '가맹점 STAND QR', '파츠커피', '4,100', '1,378,160', '', '', '', '', '', ''],
      ]);

      const result = parser.parse([data], 'chak_이용내역.xlsx');

      expect(result.data[0].is_installment).toBe(false);
    });

    it('쉼표가 포함된 금액 파싱', () => {
      const data = createFullData([
        [1, '성남사랑상품권', '2025-10-05 10:05:00', '결제완료', '가맹점 STAND QR', '성남농협', '61,050', '1,376,200', '', '', '', '', '', ''],
      ]);

      const result = parser.parse([data], 'chak_이용내역.xlsx');

      expect(result.data[0].amount).toBe(61050);
    });

    it('순번이 숫자가 아닌 행은 스킵', () => {
      const data = createFullData([
        [1, '성남사랑상품권', '2025-10-30 16:09:03', '결제완료', '가맹점 STAND QR', '파츠커피', '4,100', '1,378,160', '', '', '', '', '', ''],
        ['합계', '', '', '', '', '', '100,000', '', '', '', '', '', '', ''],  // 합계 행은 스킵
      ]);

      const result = parser.parse([data], 'chak_이용내역.xlsx');

      expect(result.data.length).toBe(1);
    });

    it('데이터가 없으면 에러 반환', () => {
      const result = parser.parse([[]], 'chak_이용내역.xlsx');

      expect(result.success).toBe(false);
      expect(result.error).toContain('데이터가 없습니다');
    });

    it('헤더를 찾을 수 없으면 에러 반환', () => {
      const data = [
        ['잘못된', '헤더', '형식'],
        ['20251008', '173352', '결제'],
      ];

      const result = parser.parse([data], 'chak_이용내역.xlsx');

      expect(result.success).toBe(false);
      expect(result.error).toContain('헤더를 찾을 수 없습니다');
    });
  });
});
