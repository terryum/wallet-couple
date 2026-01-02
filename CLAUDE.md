# CLAUDE.md

> Claude Code가 이 프로젝트를 이해하기 위한 핵심 컨텍스트

## 프로젝트 개요

**wallet_card_dashboard** - 부부의 금융 거래 내역(카드, 은행, 상품권, 투자)을 통합하여 지출/소득을 분석하는 모바일 웹 앱

- **배포 URL:** https://wallet-terry-lynn.vercel.app
- **타겟 유저:** 부부 2인 (향후 SaaS로 확장 예정)

## 핵심 문서

| 문서 | 설명 |
|------|------|
| `Current_Status.md` | 현재 진행 상황 |
| `PRD_wallet.md` | 전체 제품 명세 |
| `CATEGORIES.md` | 카테고리 정의 (지출 17개 + 소득 6개) |
| `Agents.md` | 코딩 원칙 (리팩토링 아키텍트) |

## 기술 스택

| 영역 | 기술 |
|------|------|
| Framework | Next.js 16+ (App Router) |
| Language | TypeScript (strict mode) |
| Database | Supabase (PostgreSQL + RLS) |
| State | TanStack Query |
| Styling | Tailwind CSS, shadcn/ui |
| Charts | Recharts |
| AI | Anthropic Claude API |
| Testing | Vitest (78개 테스트) |

## 명령어

```bash
npm run dev          # 개발 서버
npm run test:run     # 테스트 실행
npx tsc --noEmit     # 타입 체크
```

## 아키텍처

```
UI (Next.js App Router + React Query)
    ↓
API Routes (/api/*)
    ↓
Services (src/lib/services/)
    ↓
Repositories (src/lib/repositories/)
    ↓
Supabase (PostgreSQL + RLS)
```

### 업로드 파이프라인

1. 파일 업로드 → 2. 파싱 (loaders) → 3. 정규화 (ingestion) → 4. AI 분류 (classifier) → 5. DB 저장

## 디렉토리 구조

```
src/
├── app/                    # Next.js App Router
│   ├── api/                # API Routes
│   │   ├── upload/         # 파일 업로드 + AI 분류
│   │   ├── classify/       # 재분류 API
│   │   ├── mappings/       # 매핑 관리 API
│   │   └── transactions/   # CRUD API
│   ├── dashboard/          # 분석 화면
│   └── page.tsx            # 내역 화면 (메인)
├── components/
│   ├── dashboard/          # 차트 컴포넌트
│   ├── transactions/       # 거래 관련 컴포넌트
│   ├── settings/           # 설정 컴포넌트
│   └── ui/                 # shadcn/ui
├── hooks/                  # React Query 훅
├── lib/
│   ├── classifier/         # AI 카테고리 분류
│   ├── loaders/            # 카드사/은행 파서
│   ├── ingestion/          # 데이터 정규화
│   ├── customizations/     # 커스텀 설정 레지스트리
│   ├── services/           # 비즈니스 로직
│   └── repositories/       # DB 접근 래퍼
└── types/                  # 타입 정의
```

## 지원 소스 타입

| 유형 | 소스 |
|------|------|
| 카드 | 현대카드, 롯데카드, 삼성카드, KB국민카드 |
| 은행 | 우리은행 (소득+지출 통합) |
| 상품권 | 온누리상품권, 성남사랑상품권 |
| 투자 | 한국투자증권 (예정) |

## 데이터베이스 스키마

```sql
-- 거래 내역
CREATE TABLE transactions (
    id UUID PRIMARY KEY,
    transaction_date DATE NOT NULL,
    merchant_name TEXT NOT NULL,
    amount INTEGER NOT NULL,
    category TEXT NOT NULL,
    source_type TEXT NOT NULL,
    owner TEXT NOT NULL,           -- 'husband' | 'wife'
    transaction_type TEXT NOT NULL, -- 'expense' | 'income'
    is_deleted BOOLEAN DEFAULT FALSE,
    file_id UUID REFERENCES uploaded_files(id)
);

-- 매핑
CREATE TABLE category_mappings (pattern, category, source, match_count);
CREATE TABLE merchant_name_mappings (original_pattern, preferred_name, match_count);
```

## 카테고리 (23개)

### 지출 (17개)
- **Set A (AI 분류):** 식료품, 외식/커피, 쇼핑, 관리비, 통신/교통, 육아, 병원/미용, 기존할부, 대출이자, 양육비, 세금
- **Set B (수동):** 여행, 부모님, 친구/동료, 경조사/선물, 가전/가구, 기타

### 소득 (6개)
급여, 상여, 정부/환급, 강연/도서, 금융소득, 기타소득

## 확장 가이드

| 작업 | 수정 파일 |
|------|----------|
| 새 카드사 로더 | `src/lib/loaders/` + `index.ts` 등록 |
| 새 카테고리 | `types/index.ts` + `classifier/index.ts` + `CATEGORIES.md` |
| 새 커스텀 설정 | `customizations/registry.ts`에 등록 |

## 환경 변수

```env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx
ANTHROPIC_API_KEY=xxx
```

## 개발 규칙

1. TypeScript strict mode - `any` 사용 금지
2. 파일당 250줄 이하, 함수당 50줄 이하
3. TDD: 테스트 → 구현 → 리팩토링
4. 에러 핸들링: try/catch + 의미있는 에러 메시지
5. 리팩토링 원칙: `Agents.md` 참조
