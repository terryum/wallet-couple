import type { Owner } from '@/types';

/** 카드사/소스 표시 이름 매핑 */
export const SOURCE_TYPE_NAMES: Record<string, string> = {
  '현대카드': '현대카드',
  '롯데카드': '롯데카드',
  '삼성카드': '삼성카드',
  'KB카드': 'KB카드',
  '토스뱅크카드': '토스뱅크카드',
  '온누리': '온누리상품권',
  '성남사랑': '성남사랑상품권',
  '우리은행': '우리은행',
  '직접입력': '직접입력',
  '기타': '기타',
};

/** Owner 한글 이름 */
export const OWNER_NAMES: Record<Owner, string> = {
  husband: '남편',
  wife: '아내',
};
