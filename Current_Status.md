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
| **5탭 네비게이션** | 지출 \| 소득 \| 분석 \| 가계 \| 투자 |
| **공통 컴포넌트** | TransactionPageContent, DashboardPageContent |
| **디자인 시스템** | 토스 스타일 블루 기반 색상 시스템 |
| **가계분석 통합** | 소득/지출 통합 분석 (IncomeExpenseBarCard) |

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

### 가계분석 탭 통합 ✅

#### 통합 차트 구조 (IncomeExpenseBarCard)
```
"월별 소득/지출 변화" (메인 카드)
├── 헤더: 제목 + 기간 선택 (3/6/12/직접입력) ← 공유
│
├── "소득/지출 분석" 섹션
│   └── 소득 막대(↑) + 지출 막대(↓) + 손익선
│   └── 선택된 월 요약
│
└── "카테고리 분석" 섹션
    ├── 1줄: [전체 소득] [급여] [상여] ... (초록색)
    ├── 2줄: [전체 지출] [식료품] [외식] ... (파란색)
    └── 막대 차트 (위쪽 방향) + 합계 표시
```

#### 핵심 변경사항
- **월 동기화:** selectedMonth 변경 시 모든 차트가 해당 월을 끝월로 사용
- **손익선 확장:** 전후 1개월 추가 조회하여 경계에서 잘린 효과
- **색상 통일:** 지출=파랑 (`#3182F6`), 소득=초록 (`#059669`)
- **CategoryTrendCard 통합:** 별도 컴포넌트 제거, IncomeExpenseBarCard에 통합

#### 수정된 파일
- `src/hooks/useDashboard.ts` - endMonth 파라미터, includeExtended 옵션 추가
- `src/components/dashboard/IncomeExpenseBarCard.tsx` - 통합 차트로 리팩토링
- `src/components/dashboard/HouseholdDashboardContent.tsx` - CategoryTrendCard 제거
- `src/components/dashboard/index.ts` - CategoryTrendCard export 제거
- `src/components/dashboard/CategoryTrendCard.tsx` - 삭제

### 색상 규칙 정립 ✅

#### 변동 표시 색상 (좋음/나쁨)
| 항목 | 증가 | 감소 |
|------|------|------|
| 소득 | 🟢 초록 (좋음) | 🔵 파랑 (나쁨) |
| 지출 | 🔵 파랑 (나쁨) | 🟢 초록 (좋음) |

#### SummaryCard 수정
- `getIncomeDiffColor`: 증가=초록, 감소=파랑
- `getExpenseDiffColor`: 증가=파랑, 감소=초록

---

## 아키텍처 결정사항

### 디자인 시스템
- **단일 소스:** `src/constants/colors.ts`에서 모든 색상 관리
- **지출/소득 색상 분리:** 지출(파랑), 소득(초록) - 혼동 방지
- **CSS 변수:** `globals.css`에 `--color-brand`, `--color-expense`, `--color-income` 등

### 컴포넌트 구조
- **페이지:** 최소 코드 (props만 전달)
- **공통 컴포넌트:** `TransactionPageContent`, `DashboardPageContent`, `IncomeExpenseBarCard`
- **색상 함수:** `getCategoryColor()`, `getBadgeColorClass()`

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

## 다음 단계 (계획)

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
