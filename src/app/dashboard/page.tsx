/**
 * 지출 분석 페이지 → /household로 리다이렉트
 */

import { redirect } from 'next/navigation';

export default function DashboardPage() {
  redirect('/household');
}
