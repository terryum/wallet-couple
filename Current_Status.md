# Current_Status.md

마지막 업데이트: 2026-01-03

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
| **4탭 네비게이션** | 지출 \| 소득 \| 지출분석 \| 소득분석 |
| **공통 컴포넌트** | TransactionPageContent, DashboardPageContent |
| **디자인 시스템** | 토스 스타일 블루 기반 색상 시스템 |

### 지원 소스 타입

- **카드:** 현대카드, 롯데카드, 삼성카드, KB국민카드
- **은행:** 우리은행 (소득+지출 통합)
- **상품권:** 온누리상품권, 성남사랑상품권
- **투자:** 한국투자증권 (예정)

### 테스트 현황

- **총 169개 테스트 통과**
- `npm run test:run`으로 실행

---

## 최근 작업 (2026-01-03)

### 디자인 시스템 전면 재정비 ✅

#### 새 색상 시스템 (`src/constants/colors.ts`)
- **브랜드:** `#3182F6` (토스 블루)
- **지출:** 블루→퍼플→핑크→오렌지 (초록 제외 - 소득과 구분)
- **소득:** 에메랄드/그린 계열

#### 차트 색상 스펙트럼
```
지출: 블루 → 인디고 → 스카이 → 바이올렛 → 퍼플 → 핑크 → 로즈 → 오렌지
소득: 에메랄드 계열 (급여~기타소득)
```

#### 수정된 파일
- `src/constants/colors.ts` (신규 - 중앙 색상 정의)
- `src/constants/chart.ts` → colors.ts에서 import
- `src/app/globals.css` → CSS 변수 추가
- `src/components/transactions/TransactionRow.tsx`
- `src/components/layout/SharedBottomNav.tsx`
- `src/components/layout/SharedHeader.tsx`
- `src/components/dashboard/PieChartCard.tsx`
- `src/components/dashboard/StackedBarCard.tsx`

### 탭 통합 리팩토링 ✅

#### 공통 컴포넌트 생성
- `TransactionPageContent.tsx` - 지출/소득 내역 페이지 공통화
- `DashboardPageContent.tsx` - 지출/소득 분석 페이지 공통화
- 코드 92% 감소 (800줄 → 80줄)

#### 탭 순서 변경
- 기존: 지출 | 지출분석 | 소득 | 소득분석
- 변경: **지출 | 소득 | 지출분석 | 소득분석**

### UI 개선 ✅

- **검색 토글:** 검색 아이콘 클릭 시 검색창 확장/축소
- **SummaryCard 폭 조정:** 금액 표시 두 줄 방지
- **StackedBarCard 레전드:** 4개씩 그리드, PieChartCard 순서와 동기화

---

## 아키텍처 결정사항

### 디자인 시스템
- **단일 소스:** `src/constants/colors.ts`에서 모든 색상 관리
- **지출/소득 색상 분리:** 지출(블루~오렌지), 소득(그린) - 혼동 방지
- **CSS 변수:** `globals.css`에 `--color-brand`, `--color-expense`, `--color-income` 등

### 컴포넌트 구조
- **페이지:** 최소 코드 (props만 전달)
- **공통 컴포넌트:** `TransactionPageContent`, `DashboardPageContent`
- **색상 함수:** `getCategoryColor()`, `getBadgeColorClass()`

---

## 다음 단계 (계획)

### Step 1: 소득 대시보드 강화
- 소득 원천별 분석 차트
- 월별/연별 소득 추이

### Step 2: 투자 UI (더미데이터)
- 확정 수익 (배당, 매도차익)
- 잠재 수익 (미실현 손익)
- 포트폴리오 현황

### Step 3: portfolio 테이블 구현
- Supabase에 portfolio 테이블 생성
- 보유 종목 관리

### Step 4: KIS API 연동
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
