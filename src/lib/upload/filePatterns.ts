/**
 * 업로드 파일 이름에서 표시용 소스명 추출
 */
export function getSourceDisplayName(fileName: string): string {
  const name = fileName.toLowerCase();

  // 카드사
  if (name.includes('hyundai') || name.includes('현대')) {
    return '현대카드 명세서';
  } else if (name.includes('samsung') || name.includes('삼성')) {
    return '삼성카드 명세서';
  } else if (name.includes('lotte') || name.includes('롯데') || name.includes('이용대금명세서')) {
    return '롯데카드 명세서';
  } else if (name.includes('kb') || name.includes('국민') || name.includes('usage')) {
    return 'KB국민카드 명세서';
  }
  // 은행
  else if (name.includes('거래내역') || name.includes('woori') || name.includes('우리')) {
    return '우리은행 거래내역';
  }
  // 상품권/지역화폐
  else if (name.includes('온누리') || name.includes('onnuri')) {
    return '온누리상품권';
  } else if (
    name.includes('성남') ||
    name.includes('seongnam') ||
    name.includes('결제내역') ||
    name.includes('chak') ||
    name.includes('차크') ||
    name.includes('이용내역')
  ) {
    return '성남사랑상품권';
  }

  return '파일';
}

/**
 * 파일명에서 비밀번호 패턴 찾기 (저장/로드용)
 */
export function getPasswordPattern(fileName: string): string | null {
  const lowerName = fileName.toLowerCase();
  const patterns = ['chak']; // 지원하는 패턴들
  for (const pattern of patterns) {
    if (lowerName.includes(pattern)) {
      return pattern;
    }
  }
  return null;
}
