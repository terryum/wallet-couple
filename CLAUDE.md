# CLAUDE.md - Project Context for Claude Code

> **중요:** 컨텍스트 압축 시 반드시 `Current_Status.md`를 먼저 참조하세요.

## Project Overview
**wallet_card_dashboard** - 부부의 금융 결제 내역(카드, 은행, 지역화폐)을 통합하여 월별 가계 현황을 파악하고 분석하는 모바일 웹 애플리케이션

## 관련 문서 (Related Documents)
| 문서 | 설명 |
|-----|------|
| [`Current_Status.md`](./Current_Status.md) | 현재 진행 상황, 완료된 Phase, 프로젝트 구조 |
| [`PRD_wallet.md`](./PRD_wallet.md) | 전체 프로젝트 방향성 및 요구사항 |
| [`PRD_wallet_ux.md`](./PRD_wallet_ux.md) | 사용자 인터랙션, 모달 흐름, 제스처 |
| [`PRD_wallet_back.md`](./PRD_wallet_back.md) | 백엔드 아키텍처, DB 스키마, API |
| [`PRD_wallet_dataloader.md`](./PRD_wallet_dataloader.md) | 카드사/은행별 데이터 로더 명세 |
| [`CATEGORIES.md`](./CATEGORIES.md) | 카테고리 정의 및 수정 가이드 |

## Tech Stack
- **Framework:** Next.js 14+ (App Router), React 18+, TypeScript
- **Styling:** Tailwind CSS, shadcn/ui
- **Database:** Supabase (PostgreSQL)
- **Charts:** Recharts
- **State:** TanStack Query (React Query)
- **AI:** Anthropic Claude API (@anthropic-ai/sdk)
- **Testing:** Vitest

## Key Commands
```bash
# 개발 서버
npm run dev -- -p 3001

# 테스트 실행
npm run test:run

# 타입 체크
npx tsc --noEmit
```

## Project Structure
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
│   ├── dashboard/          # PieChartCard, StackedBarCard, CategoryPopup
│   ├── transactions/       # TransactionList, FileUploader 등
│   ├── settings/           # SettingsDropdown, MappingsManagement 등
│   └── ui/                 # shadcn/ui 컴포넌트
├── constants/              # 차트 색상 등 상수
├── hooks/                  # useDashboard, useTransactions, usePWAInstall 등
├── lib/
│   ├── classifier/         # AI 카테고리 분류
│   ├── loaders/            # 카드사/은행 파서 (hyundai, lotte, samsung, kb, onnuri, seongnam, woori)
│   ├── supabase/           # DB 클라이언트 및 쿼리
│   └── utils/              # 유틸리티 함수
└── types/                  # 타입 정의
```

## Data Loaders (Important Implementation Details)

### 현대카드 로더 (hyundai.ts)
- **금액 추출 우선순위:** 인덱스 6 → 인덱스 7 → 뒤에서부터 찾기 → 가맹점명에서 추출
- **검증:** 인덱스 6 합계 = 총 합계 행의 인덱스 7
- **스킵 키워드:** 소비쿠폰, 청구할인, 상품권사용, 소계, 합계 등

### 롯데카드 로더 (lotte.ts)
- 모든 시트를 검사하여 헤더 찾음

### 우리은행 로더 (woori.ts) - 소득/지출 통합
- **입금(소득):** 맡기신금액 > 0 → transaction_type: 'income'
- **출금(지출):** 찾으신금액 > 0 → transaction_type: 'expense'
- **최소 금액:** 5,000원 이하 무시
- **소득 카테고리:** 월급여→급여, 상여→상여, 환급→정부/환급, 기본→강연/도서
- **지출 카테고리:** 대출이자, 양육비, 세금, 쇼핑 등 자동 매핑
- **CD 거래:** 적요에 "CD" 포함 시 이용처를 "ATM 인출"로 자동 변환
- **제외 패턴:** 본인/배우자 이체, 카드 결제, 상품권 충전 등

### 공통 사항
- 스킵 키워드로 소계/합계 행 필터링
- 금액 0 이하인 행은 검증 후 제거

## Database Schema
```sql
-- 거래 내역
CREATE TABLE transactions (
    id UUID PRIMARY KEY,
    transaction_date DATE NOT NULL,
    merchant_name TEXT NOT NULL,
    amount INTEGER NOT NULL,
    category TEXT NOT NULL,
    memo TEXT,
    source_type TEXT NOT NULL,
    owner TEXT NOT NULL,
    is_deleted BOOLEAN DEFAULT FALSE,
    transaction_type TEXT NOT NULL DEFAULT 'expense', -- 'expense' 또는 'income'
    raw_data JSONB,
    file_id UUID REFERENCES uploaded_files(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 카테고리/이용처 매핑
CREATE TABLE category_mappings (pattern, category, source, match_count);
CREATE TABLE merchant_name_mappings (original_pattern, preferred_name, match_count);

-- 변경 이력
CREATE TABLE action_history (action_type, entity_type, entity_id, description, previous_data, new_data);
```

## Categories
> 상세 내용: [`CATEGORIES.md`](./CATEGORIES.md)

### 지출 카테고리
**AI 자동 분류 (Set A, 11개):** 식료품, 외식/커피, 쇼핑, 관리비, 통신/교통, 육아, 병원/미용, 기존할부, 대출이자, 양육비, 세금

**사용자 수동 (Set B, 6개):** 여행, 부모님, 친구/동료, 경조사/선물, 가전/가구, 기타

### 소득 카테고리 (6개)
급여, 상여, 정부/환급, 강연/도서, 금융소득, 기타소득

## Supabase Configuration
- **Project ID:** pcxgmvjtqhvkbnmkciho
- **URL:** https://pcxgmvjtqhvkbnmkciho.supabase.co
- MCP를 통해 테이블 관리

## Development Rules
1. TypeScript strict mode - `any` 사용 금지
2. 파일당 250줄 이하, 함수당 50줄 이하
3. TDD: 테스트 → 구현 → 리팩토링
4. 에러 핸들링: try/catch + 의미있는 에러 메시지
5. `Current_Status.md` 주기적 업데이트

## Key Files to Check First
- `Current_Status.md` - 현재 진행 상황
- `plan_wallet.md` - 개발 계획
- `PRD_wallet_dataloader.md` - 데이터 로더 상세 명세
- `TEST_PLAN.md` - 테스트 계획서

## Recent Updates (2025-12-31)

### Phase 17: 대시보드 소득/지출 분리
1. 대시보드 차트에서 지출만 분석하도록 수정 (소득 혼입 버그 해결)
2. `queries.ts` - `getMonthlyAggregation`, `getMonthlyTotal`에 `transactionType` 파라미터 추가
3. `/api/transactions/route.ts` - summary 데이터에 `transactionType` 전달
4. `useDashboard.ts` - API 호출 시 `transaction_type=expense` 파라미터 추가
5. `/api/billing-comparison/route.ts` - 지출만 집계하도록 수정

### Phase 16: UX 단순화 및 데이터 동기화
1. CategorySheet 제거 - 모든 항목 클릭 시 EditModal로 직접 이동
2. SummaryCard 소득 데이터 표시 수정 (`transactionType` API 파라미터 추가)
3. UploadResultPopup 삭제 후 리스트 업데이트 (Optimistic Update)
4. EditModal 닫힐 때 UploadResultPopup 데이터 자동 동기화
5. SimilarTransactionsModal history race condition 수정 (50ms 딜레이)

### Phase 15: 카테고리 확장 및 모달 개선
1. 세금 카테고리 추가 (국세, 지방세, 자동차세 등)
2. "이자" → "대출이자" 카테고리명 변경
3. 우리은행 로더 CD 거래 → "ATM 인출" 자동 변환
4. UploadResultPopup 중첩 모달 네비게이션 버그 수정
5. EditModal 소득/지출 카테고리 분리
6. SummaryCard "원" 정렬 개선

## Sample Data Location
`sample-data/` 폴더에 카드사별 샘플 명세서 파일 위치
