# CLAUDE.md - Project Context for Claude Code

## Project Overview
**wallet_card_dashboard** - 부부의 금융 결제 내역(카드, 은행, 지역화폐)을 통합하여 월별 가계 현황을 파악하고 분석하는 모바일 웹 애플리케이션

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
│   ├── loaders/            # 카드사 파서 (hyundai, lotte, samsung, kb, onnuri, seongnam)
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
**AI 자동 분류 (Set A):** 식료품, 외식/커피, 쇼핑, 관리비, 통신/교통, 육아, 미용/기타, 기존할부, 이자, 양육비

**사용자 수동 (Set B):** 여행, 부모님, 친구/동료, 경조사/선물, 가전/가구, 기타

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

## Recent Updates (2025-12-30)

### Phase 13-14: 차트 리팩토링 및 UI/UX 개선
1. CategoryPopup 공유 컴포넌트 생성 (PieChartCard, StackedBarCard 공유)
2. useCategoryCalculation 훅으로 카테고리 계산 로직 통합
3. 레전드 클릭 시 양쪽 차트 하이라이트 동기화
4. PieChartCard: 도넛 여백/슬라이스/중앙 클릭 이벤트 분리
5. StackedBarCard: 카테고리별 증감율 표시
6. SettingsDropdown: 앱 설치, 패턴 매핑 관리 기능 추가
7. action_history 테이블 생성 (변경 이력 추적)

### 이전 수정 (2025-12-29)
1. 현대카드 금액 추출: 인덱스 7 → 6 우선순위 변경
2. findPaymentAmountFromEnd 검색 범위 제한 (인덱스 4 이상)

## Sample Data Location
`sample-data/` 폴더에 카드사별 샘플 명세서 파일 위치
