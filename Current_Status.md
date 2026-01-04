# Current_Status.md

마지막 업데이트: 2026-01-04

## 현재 구현 상태

### 완료된 기능

| 기능 | 설명 |
|------|------|
| 파일 업로드 | 카드사/은행/상품권 명세서 파싱 |
| AI 분류 | Claude API 기반 자동 카테고리 분류 |
| 거래 CRUD | 조회/수정/삭제/수동 추가 |
| 일괄 수정 | 비슷한 거래 일괄 카테고리 변경 |
| 대시보드 | 월별 지출/소득 분석, 차트 |
| PWA | 홈 화면 설치, 오프라인 캐싱 |
| 매핑 관리 | 카테고리/이용처 매핑 확인 및 수정 |
| **5탭 네비게이션** | 지출 \| 소득 \| 분석 \| 가계 \| 투자 |
| **공통 컴포넌트** | TransactionPageContent, DashboardPageContent |
| **디자인 시스템** | 토스 스타일 블루 기반 색상 시스템 |
| **가계분석 통합** | 소득/지출 통합 분석 (IncomeExpenseBarCard) |
| **앱 레벨 프리페칭** | DataPrefetcher로 초기 로딩 최적화 |
| **유틸리티 모듈화** | math.ts, date.ts로 중복 제거 |
| **queryKey 팩토리** | queryKeys.ts로 일관성 확보 |
| **추세 캐싱** | stale-while-revalidate 패턴으로 빈 화면 방지 |

### 지원 소스 타입

- **카드:** 현대카드, 롯데카드, 삼성카드, KB국민카드
- **은행:** 우리은행 (소득+지출 통합)
- **상품권:** 온누리상품권, 성남사랑상품권
- **투자:** 한국투자증권 (예정)

### 테스트 현황

- **총 169개 테스트 통과**
- `npm run test:run`으로 실행

---

## 최근 작업 (2026-01-04)

### 로딩 속도 최적화 ✅

#### 1. 사용자 클릭 우선순위 버그 수정

**문제:** 첫 화면 로드 후 다른 탭 클릭 시 반응이 매우 느림 (프리페칭과 네트워크 경쟁)

**해결:**
- `PrefetchManager.ts`: `notifyUserAction()`에서 진행 중인 fetch 즉시 취소
- `useTransactions.ts`, `useDashboard.ts`: 사용자 요청에 `priority: 'high'` 추가
- `DataPrefetcher.tsx`: 프리페칭에 `priority: 'low'` 추가

#### 2. 서버 과부하 방지

**문제:** 가계분석 탭에서 10+ 동시 API 요청으로 Supabase 과부하 (응답 2-6초)

**해결:**
- `DataPrefetcher.tsx`: 프리페칭 최소화 (이전 1개월만, 3초 후 시작)
- `HouseholdDashboardContent.tsx`: 추세 데이터 점진적 로딩 (도넛차트 완료 후 500ms 대기)
- `useDashboard.ts`: `monthCount=0`이면 쿼리 비활성화

#### 3. billing-comparison API 병렬화

**문제:** 12개월 × 2쿼리 = 24개 순차 DB 호출 (5.4초)

**해결:** `Promise.all`로 병렬화 → **1.5초 (72% 개선)**

**수정 파일:** `src/lib/services/billing.service.ts`

#### 4. 추세 그래프 stale-while-revalidate 캐싱

**문제:** 가계분석 탭 첫 로딩 시 추세 그래프 빈 화면이 오래 지속

**해결:**
```
┌─────────────────────────────────────────────────────────────┐
│  가계분석 탭 오픈                                              │
│         ↓                                                   │
│  1. localStorage에서 캐시된 추세 데이터 즉시 표시               │
│         ↓ (빈 화면 없음!)                                     │
│  2. 백그라운드에서 3개월 소득/지출 데이터 로드                   │
│         ↓                                                   │
│  3. 로딩 완료 시 그래프 자동 업데이트 + 캐시 갱신               │
└─────────────────────────────────────────────────────────────┘
```

**신규 파일:**
- `src/lib/cache/trendCache.ts`: localStorage 기반 캐시 유틸리티
- `src/lib/cache/index.ts`: 모듈 export

**수정 파일:**
- `src/hooks/useDashboard.ts`: stale-while-revalidate 패턴 적용
- `src/hooks/useTransactions.ts`: 데이터 변경 시 캐시 무효화
- `src/components/transactions/FileUploader.tsx`: 업로드 시 캐시 무효화

#### 성능 개선 결과

| 지표 | 이전 | 현재 | 개선율 |
|------|------|------|--------|
| 탭별 API 응답 | 2-6초 | 0.4-0.5초 | ~85% |
| billing-comparison | 5.4초 | 1.5초 | 72% |
| 추세 그래프 빈 화면 | 3-5초 | 0초 (캐시) | 100% |

---

### 클린 아키텍처 리팩토링 ✅

#### Phase 1: NaN 버그 수정

**신규 파일:** `src/lib/utils/math.ts`
- `safePercentage()`: 안전한 백분율 계산 (0으로 나누기 방지)
- `safeYAxisDomain()`: 차트 Y축 범위 계산 (빈 배열/NaN 방지)
- `safeDivide()`, `safePercentChange()`: 추가 유틸리티

**수정된 파일:**
- `IncomeExpenseBarCard.tsx`: Y축 범위 계산 안전화
- `DualPieChartCard.tsx`: 백분율 계산 안전화
- `useCategoryCalculation.ts`: 백분율 계산 안전화

#### Phase 2: 상수 중앙화

**신규 파일:**
- `src/constants/timing.ts`: 프리페칭 지연 시간 상수
- `src/constants/categories.ts`: 카테고리 그룹 상수

#### Phase 3: 코드 중복 제거

**신규 파일:**
- `src/lib/utils/date.ts`: 날짜/월 계산 유틸리티 (중복 제거)
  - `getAdjacentMonth()`, `getRecentMonths()`, `getLastMonth()` 등
- `src/components/common/FloatingActionButtons.tsx`: 플로팅 버튼 공통 컴포넌트
- `src/hooks/queryKeys.ts`: React Query 키 팩토리 (일관성 확보)

**수정된 파일 (중복 제거):**
- `AppContext.tsx`: date.ts 사용
- `DataPrefetcher.tsx`: date.ts + timing.ts 사용
- `useDashboard.ts`: date.ts 사용
- `useTransactions.ts`: date.ts 사용

### 테스트 결과
- **169개 테스트 모두 통과** ✅
- 타입 체크 통과 ✅

---

## 이전 작업 (2026-01-03)

### 0. 초기 화면 변경 ✅

#### 기본 월 변경
- **이전:** 이번 달 (예: 2026-01)
- **이후:** 지난 달 (예: 2025-12)
- `AppContext.tsx`: `getCurrentYearMonth()` → `getLastMonth()`

#### 첫 화면 변경
- **이전:** 지출 탭 (`/`)
- **이후:** 가계분석 탭 (`/household`)
- `page.tsx`: 지출 내역 → `/household` 리다이렉트
- `expense/page.tsx`: 새로운 지출 페이지 생성
- `SharedBottomNav.tsx`: 지출 탭 href `/` → `/expense`

### 1. UI 개선 ✅

#### DualPieChartCard (가계분석 도넛차트)
- 드롭다운 아이콘(▼/▲) 위치: 금액 오른쪽으로 이동 (`소득 ... 00만원 ▼`)
- 색상 통일: `getCategoryColor()` 함수로 모든 컴포넌트 색상 일관성 확보
- 데이터 없을 때 중앙 라벨 숨김
- 드롭다운 카테고리 클릭 시 CategoryPopup 오픈

#### IncomeExpenseBarCard (추세 차트)
- "00월 소득/지출" 섹션에 전월 대비 증감 표시 `(+00만원)` 회색, 작은 글자
- 손익 표시 (+00만원 초록/파랑) 삭제 → 증감만 표시

#### SummaryCard (이번 달 총 소득/지출)
- "(+00만)" 색상: 모두 회색 (`text-slate-400`)
- "(+00만)" 위치: 라벨 옆으로 이동
- 헤더와 드롭다운 항목 크기 통일 (`text-[10px]`)

### 2. React Hooks 버그 수정 ✅

#### CategoryPopup 훅 순서 오류 수정
- **문제:** `if (!isOpen || !category) return null;` 이후에 `useCallback`, `useModalBackHandler` 호출
- **해결:** 모든 훅을 조건부 return 이전으로 이동

### 3. 성능 최적화 - 앱 레벨 프리페칭 ✅

#### 문제 분석
- `usePrefetchDashboardData`가 TransactionPageContent(지출 탭)에서만 호출
- 사용자가 가계분석 탭 직접 방문 시 프리페칭 미실행
- 가계분석 탭은 소득+지출 동시 로딩 + 추세 데이터(6개월) 필요로 느림

#### 해결책: DataPrefetcher 컴포넌트 생성

```
src/components/DataPrefetcher.tsx (신규)
src/components/Providers.tsx (수정)
```

**프리페칭 전략:**

| 단계 | 시점 | 프리페칭 대상 |
|------|------|-------------|
| 1단계 | 즉시 | 현재 월 지출 데이터 (최고 우선순위) |
| 2단계 | 100ms | 현재 월 소득 데이터 |
| 3단계 | 300ms | 이전 2개월 소득/지출 데이터 |
| 4단계 | 500ms | 가계분석용 8개월, 14개월 추세 데이터 |
| 5단계 | 800ms | 다음 월 데이터 (월 이동 대비) |

**효과:**
- 앱 접속 즉시 지출 탭 데이터 로딩
- 백그라운드에서 다른 탭 데이터 미리 로딩
- 가계분석 탭 클릭 시 캐시된 데이터로 즉시 표시

---

## 아키텍처 결정사항

### 디자인 시스템
- **단일 소스:** `src/constants/colors.ts`에서 모든 색상 관리
- **지출/소득 색상 분리:** 지출(파랑 `#3182F6`), 소득(초록 `#059669`)
- **색상 함수:** `getCategoryColor()` - 모든 컴포넌트에서 동일 색상 사용

### 컴포넌트 구조
- **페이지:** 최소 코드 (props만 전달)
- **공통 컴포넌트:** `TransactionPageContent`, `DashboardPageContent`, `IncomeExpenseBarCard`
- **프리페칭:** `DataPrefetcher` (Providers에서 렌더링)

### 프리페칭 구조
```
Providers
├── QueryClientProvider
│   └── AppProvider
│       ├── DataPrefetcher (앱 레벨 프리페칭)
│       └── {children}
```

### 캐싱 구조 (stale-while-revalidate)
```
useMultiMonthBothAggregation
├── 마운트 시: localStorage에서 캐시 로드 → 즉시 반환
├── 백그라운드: React Query로 서버 데이터 fetch
└── 완료 시: 캐시 갱신 + UI 업데이트

데이터 변경 시 (생성/수정/삭제/업로드):
└── clearTrendCache() 호출 → 다음 방문 시 새 데이터 로드
```

### 가계분석 데이터 흐름
```
selectedMonth (AppContext)
    ↓
useMultiMonthBothAggregation(monthCount, owner, endMonth, includeExtended)
    ↓
IncomeExpenseBarCard
├── 소득/지출 분석 (ComposedChart)
└── 카테고리 분석 (BarChart)
```

---

## 수정된 파일 목록

### 이번 세션
- `src/components/dashboard/DualPieChartCard.tsx` - UI 개선, 색상 통일
- `src/components/dashboard/IncomeExpenseBarCard.tsx` - 증감 표시, 손익 제거
- `src/components/dashboard/CategoryPopup.tsx` - 훅 순서 수정
- `src/components/transactions/SummaryCard.tsx` - 레이아웃 개선
- `src/components/Providers.tsx` - DataPrefetcher 통합
- `src/components/DataPrefetcher.tsx` - 신규 생성
- `src/components/transactions/TransactionPageContent.tsx` - 중복 프리페칭 제거

---

## 다음 단계 (계획)

### 리팩토링 남은 작업 (선택)
- 하드코딩 색상 교체 (19개 파일에서 `#3182F6` → `brand`)
- 대형 컴포넌트 분할 (StackedBarCard 744줄, IncomeExpenseBarCard 597줄)
- FloatingActionButtons 적용 (3개 파일에서 기존 코드 교체)

### Step 1: 투자 UI (더미데이터)
- 확정 수익 (배당, 매도차익)
- 잠재 수익 (미실현 손익)
- 포트폴리오 현황

### Step 2: portfolio 테이블 구현
- Supabase에 portfolio 테이블 생성
- 보유 종목 관리

### Step 3: KIS API 연동
- 한국투자증권 Open API
- 실시간 포트폴리오 동기화

---

## 환경 설정

```bash
# 개발 서버
npm run dev

# 테스트
npm run test:run

# 타입 체크
npx tsc --noEmit
```

### 환경 변수 (.env)

```env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx
ANTHROPIC_API_KEY=xxx
```

---

## 알려진 이슈

- API 키 미설정 시 AI 분류가 "기타"로 fallback
- Vercel 배포 시 환경변수 설정 필수
