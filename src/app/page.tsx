/**
 * 메인 페이지 - 지출 탭으로 리다이렉트
 * 사용자가 처음 접근 시 지난달 지출 화면을 보여줌
 */

import { redirect } from 'next/navigation';

export default function HomePage() {
  redirect('/expense');
}
