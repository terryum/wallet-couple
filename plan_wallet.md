# Wallet Card Dashboard - 개발 계획서 (Development Plan)

## 1. 프로젝트 개요 요약

**목적:** 부부의 파편화된 금융 결제 내역(카드, 은행, 지역화폐)을 통합하여 월별 가계 현황을 파악하고 분석하는 모바일 웹 애플리케이션.

**핵심 가치:**
1. 데이터의 완전성 (사용자 직접 명세서 업로드)
2. 유연한 편집 (AI 1차 분류 + 사용자 최종 수정)
3. 직관적인 시각화 (카테고리별/월별 분석)

**최종 업데이트:** 2025-12-29

---

## 2. 기술 스택

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14+ (App Router), React 18+, TypeScript |
| **Styling** | Tailwind CSS, shadcn/ui, lucide-react |
| **Charts** | Recharts |
| **State** | TanStack Query (React Query) |
| **Backend** | Next.js API Routes |
| **Database** | Supabase (PostgreSQL) |
| **AI** | Anthropic Claude API (@anthropic-ai/sdk) |
| **Hosting** | Vercel (예정) |
| **Testing** | Vitest |

---

## 3. 프로젝트 구조

```
wallet_card_dashboard/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── upload/route.ts        # POST - 파일 업로드 + AI 분류
│   │   │   ├── classify/route.ts      # POST - 재분류 API
│   │   │   └── transactions/
│   │   │       ├── route.ts           # GET - 거래 목록 조회
│   │   │       └── [id]/route.ts      # PATCH/DELETE - 개별 수정/삭제
│   │   ├── dashboard/page.tsx         # 분석 화면
│   │   ├── layout.tsx
│   │   └── page.tsx                   # 내역 화면 (메인)
│   │
│   ├── components/
│   │   ├── ui/                        # shadcn/ui 컴포넌트
│   │   ├── transactions/              # 내역 관련 컴포넌트
│   │   │   ├── TransactionList.tsx
│   │   │   ├── TransactionRow.tsx
│   │   │   ├── EditModal.tsx
│   │   │   ├── CategorySheet.tsx
│   │   │   └── FileUploader.tsx
│   │   ├── dashboard/                 # 분석 관련 컴포넌트
│   │   │   ├── PieChartCard.tsx
│   │   │   └── StackedBarCard.tsx
│   │   └── Providers.tsx              # React Query Provider
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts              # Supabase 클라이언트
│   │   │   └── queries.ts             # DB 쿼리 함수
│   │   ├── loaders/                   # 데이터 파서 모듈
│   │   │   ├── index.ts               # Parser Factory (selectParser)
│   │   │   ├── types.ts               # 공통 타입
│   │   │   ├── base.ts                # BaseLoader 추상 클래스
│   │   │   ├── hyundai.ts             # 현대카드
│   │   │   ├── lotte.ts               # 롯데카드
│   │   │   ├── samsung.ts             # 삼성카드
│   │   │   ├── kb.ts                  # KB국민카드
│   │   │   └── general.ts             # 일반 파서
│   │   ├── classifier/                # AI 카테고리 분류
│   │   │   └── index.ts
│   │   └── utils/
│   │       └── format.ts              # 날짜, 금액 포맷
│   │
│   ├── hooks/
│   │   ├── useDashboard.ts            # 대시보드 데이터 훅
│   │   ├── useTransactions.ts         # 거래내역 CRUD 훅
│   │   └── useUpload.ts               # 파일 업로드 훅
│   │
│   └── types/
│       └── index.ts                   # 글로벌 타입 정의
│
├── tests/
│   └── loaders/                       # 파서 단위 테스트 (48개)
│       ├── hyundai.test.ts
│       ├── samsung.test.ts
│       ├── lotte.test.ts
│       └── kb.test.ts
│
├── sample-data/                       # 테스트용 샘플 명세서
├── Current_Status.md                  # 진행 상황 추적
├── plan_wallet.md                     # 본 문서
└── .env                               # 환경변수
```

---

## 4. 개발 단계 (Development Phases)

### Phase 1: 프로젝트 초기 설정 및 인프라 ✅ 완료
- [x] Next.js 프로젝트 생성 (TypeScript, Tailwind CSS)
- [x] shadcn/ui 설치 및 기본 컴포넌트 설정
- [x] Supabase 프로젝트 생성 및 연결
- [x] `transactions` 테이블 스키마 생성 (MCP 사용)
- [x] 환경변수 설정 (.env)
- [x] Vitest 설정

### Phase 2: 데이터 로더 (Parsers) - TDD ✅ 완료
> 각 파서별로 "테스트 작성 → 구현 → 리팩토링" 사이클 수행

#### 2.1. 공통 인프라
- [x] `lib/loaders/types.ts`: 공통 출력 스키마 타입 정의
- [x] `lib/loaders/index.ts`: Parser Factory 패턴 구현
- [x] `lib/loaders/base.ts`: BaseLoader 추상 클래스

#### 2.2. 현대카드 파서 (16 tests)
- [x] 샘플 데이터 준비
- [x] 테스트 작성 및 구현
- [x] 금액 추출 우선순위 수정 (인덱스 6 → 7 → 뒤에서부터)
- [x] 검증 로직 구현 (인덱스 6 합계 = 총 합계)
- [x] 스킵 키워드 필터링

#### 2.3. 롯데카드 파서 (7 tests)
- [x] 샘플 데이터 준비
- [x] 테스트 작성 및 구현
- [x] 모든 시트 검사 로직 추가

#### 2.4. 삼성카드 파서 (7 tests)
- [x] 샘플 데이터 준비
- [x] 테스트 작성 및 구현

#### 2.5. KB국민카드 파서 (8 tests)
- [x] 샘플 데이터 준비
- [x] 테스트 작성 및 구현

#### 2.6. 일반 파서 (Fallback)
- [x] `lib/loaders/general.ts` 구현

### Phase 3: AI 카테고리 분류 ✅ 완료
- [x] Anthropic SDK 설치 (@anthropic-ai/sdk)
- [x] Claude API 연동 (`lib/classifier/index.ts`)
- [x] 카테고리 Set A 프롬프트 설계
- [x] 분류 함수 구현 및 테스트
- [x] 업로드 시 자동 분류 연동
- [x] 재분류 API 구현 (`/api/classify`)

### Phase 4: 백엔드 API ✅ 완료
#### 4.1. 데이터베이스 쿼리
- [x] `lib/supabase/client.ts`: Supabase 클라이언트 초기화
- [x] `lib/supabase/queries.ts`: CRUD + 집계 쿼리 함수

#### 4.2. API Routes
- [x] `POST /api/upload`: 파일 수신 → 파싱 → AI 분류 → Insert
- [x] `GET /api/transactions`: 월별 조회, is_deleted 필터링
- [x] `PATCH /api/transactions/:id`: 수정/Soft Delete
- [x] `POST /api/classify`: 재분류

### Phase 5: 프론트엔드 - 내역 화면 ✅ 완료
#### 5.1. 레이아웃 및 공통 컴포넌트
- [x] 반응형 레이아웃 설정
- [x] 월 선택기 (Year-Month Picker)
- [x] 필터 칩 (Filter Chips)
- [x] 스티키 헤더/필터 통합

#### 5.2. 거래내역 테이블
- [x] `TransactionList.tsx`: 리스트 컨테이너
- [x] `TransactionRow.tsx`: 개별 행
- [x] 스켈레톤 로딩 UI

#### 5.3. 인터랙션
- [x] `FileUploader.tsx`: 파일 업로드 + 파일별 진행 상태
- [x] `CategorySheet.tsx`: 카테고리 변경 바텀시트
- [x] `EditModal.tsx`: 행 편집/삭제 모달
- [x] FAB (행 추가 버튼)

### Phase 6: 프론트엔드 - 분석 화면 ✅ 완료
- [x] 페이지 라우팅 (`/dashboard`)
- [x] Carousel/Swipe 네비게이션
- [x] `PieChartCard.tsx`: 월별 지출 비중 도넛 차트
  - [x] 클릭 시 상세 팝업
  - [x] 호버 팝업 제거
- [x] `StackedBarCard.tsx`: 월별 지출 추세 막대 차트
  - [x] 클릭 시 하단 상세 표시
  - [x] 상세 항목 클릭 시 카테고리 팝업
- [x] 기간 선택 (3/6/12개월)
- [x] 하단 네비게이션

### Phase 7: 통합 테스트 및 최적화 ✅ 완료
- [x] 단위 테스트 48개 통과
- [x] 기능 테스트 시나리오 통과
- [x] 모바일 반응형 검증
- [x] 버그 수정 (12건)

### Phase 8: 배포 🔜 예정
- [ ] Vercel 프로젝트 연결
- [ ] 환경변수 설정 (Production)
- [ ] 도메인 설정 (선택)
- [ ] 최종 QA

---

## 5. 데이터베이스 스키마

```sql
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_date DATE NOT NULL,
    merchant_name TEXT NOT NULL,
    amount INTEGER NOT NULL,
    category TEXT NOT NULL,
    memo TEXT,
    source_type TEXT NOT NULL,         -- '현대카드', '롯데카드' 등
    owner TEXT NOT NULL,               -- 'husband' | 'wife'
    is_deleted BOOLEAN DEFAULT FALSE,
    raw_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_transactions_date ON transactions(transaction_date);
CREATE INDEX idx_transactions_owner ON transactions(owner);
CREATE INDEX idx_transactions_category ON transactions(category);
CREATE INDEX idx_transactions_deleted ON transactions(is_deleted);

-- 부분 유니크 인덱스 (중복 방지)
CREATE UNIQUE INDEX idx_transactions_unique
ON transactions(transaction_date, merchant_name, amount)
WHERE is_deleted = false;
```

---

## 6. 카테고리 정의

### Set A: AI 자동 분류
| 카테고리 | 설명 |
|---------|------|
| 식료품 | 마트, 편의점 등 |
| 외식/커피 | 레스토랑, 카페 등 |
| 쇼핑 | 의류, 잡화 등 |
| 관리비 | 아파트 관리비 등 |
| 통신/교통 | 통신비, 교통비, 주유비 등 |
| 육아 | 어린이집, 유아용품 등 |
| 미용/기타 | 미용실, 기타 |
| 기존할부 | 할부 결제 건 |
| 이자 | 대출 이자 등 |
| 양육비 | 양육비 지출 |

### Set B: 사용자 수동 전용
| 카테고리 | 설명 |
|---------|------|
| 여행 | 여행 관련 지출 |
| 부모님 | 부모님 용돈, 선물 |
| 친구/동료 | 경조사 외 지인 관련 |
| 경조사/선물 | 축의금, 조의금, 선물 |
| 가전/가구 | 큰 지출 (가전, 가구) |
| 기타 | 분류 불가 |

---

## 7. 개발 원칙 (Rules_wallet.md 요약)

1. **Strict Typing:** TypeScript 인터페이스 필수, `any` 사용 금지
2. **No Placeholders:** 완전한 구현 또는 명시적 질문
3. **Error Handling:** try/catch + 의미있는 에러 메시지
4. **Small Files:** 파일당 250줄 이하
5. **Small Functions:** 함수당 50줄 이하
6. **TDD:** 테스트 → 구현 → 리팩토링
7. **DRY & SOLID:** 중복 제거, 단일 책임 원칙
8. **Context Management:** `Current_Status.md` 주기적 업데이트

---

## 8. 리스크 및 고려사항

| 리스크 | 대응 방안 | 상태 |
|--------|----------|------|
| 카드사 명세서 포맷 변경 | General Parser fallback, 에러 로깅 | ✅ 대응됨 |
| AI 분류 정확도 | 사용자 수정 UI 제공, 재분류 기능 | ✅ 대응됨 |
| 파일 파싱 속도 | 파일별 진행 상태 UI | ✅ 대응됨 |
| 중복 데이터 업로드 | 부분 유니크 인덱스 + 중복 건수 표시 | ✅ 대응됨 |

---

*문서 작성일: 2025-12-26*
*최종 업데이트: 2025-12-29*
*다음 단계: Phase 8 배포*
