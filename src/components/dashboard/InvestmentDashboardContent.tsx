/**
 * 투자분석 페이지 컴포넌트
 * 현재 준비 중 상태
 */

'use client';

import { TrendingUp, LineChart } from 'lucide-react';
import { SharedHeader, SharedBottomNav } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { brand } from '@/constants/colors';

export function InvestmentDashboardContent() {
  return (
    <div className="min-h-screen bg-slate-50 pb-40">
      {/* 공통 헤더 */}
      <div className="sticky top-0 z-40 bg-white border-b border-slate-100">
        <SharedHeader />
      </div>

      {/* 준비 중 메시지 */}
      <div className="px-5 pt-5">
        <div className="max-w-lg mx-auto">
          <Card className="rounded-2xl">
            <CardContent className="py-16">
              <div className="flex flex-col items-center justify-center text-center">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                  style={{ backgroundColor: `${brand.primary}15` }}
                >
                  <LineChart className="w-8 h-8" style={{ color: brand.primary }} />
                </div>
                <h2 className="text-lg font-semibold text-slate-900 mb-2">
                  투자분석 준비 중
                </h2>
                <p className="text-sm text-slate-500 max-w-xs">
                  포트폴리오 현황, 배당금, 매매 손익 등<br />
                  투자 관련 분석 기능을 준비하고 있습니다.
                </p>

                {/* 예정 기능 미리보기 */}
                <div className="mt-8 w-full max-w-sm space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl text-left">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">확정 수익</p>
                      <p className="text-xs text-slate-500">배당금, 이자, 매도차익</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl text-left">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <LineChart className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">포트폴리오</p>
                      <p className="text-xs text-slate-500">보유 종목, 수익률, 자산 배분</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 공통 하단 네비게이션 */}
      <SharedBottomNav />
    </div>
  );
}
