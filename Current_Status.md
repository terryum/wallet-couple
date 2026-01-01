# Current_Status.md

마지막 업데이트: 2026-01-01

## 1) 현재 구현 상태

### 핵심 기능
- 파일 업로드 (카드사/은행 명세서) 및 자동 파싱
- AI 기반 카테고리 자동 분류 (Claude API)
- 거래 내역 조회/수정/삭제
- 대시보드 (월별 지출/소득 분석)
- 비슷한 거래 일괄 수정 기능

### 지원 소스 타입
- 카드: 현대카드, 롯데카드, 삼성카드, KB카드, 토스뱅크카드
- 상품권: 온누리상품권, 성남사랑상품권
- 은행/증권: 우리은행, 한국투자증권
- 직접입력

### 최근 추가된 기능
- 업로드 결과 메시지 개선 (파일 수/중복 정보 표시)
- 패턴 저장 체크박스 (일괄 수정 시 선택적 저장)
- 사용자 커스텀 설정 중앙 관리 시스템 도입

## 2) 아키텍처

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

### 주요 모듈
| 디렉토리 | 역할 |
|---------|------|
| `src/lib/ingestion/` | 청구월 추출, 분류 준비, 거래 변환 |
| `src/lib/classifier/` | AI 기반 카테고리 분류 |
| `src/lib/customizations/` | 사용자 커스텀 설정 레지스트리 (NEW) |
| `src/lib/services/` | 비즈니스 로직 |
| `src/lib/repositories/` | DB 접근 래퍼 |
| `src/hooks/` | React Query 훅 |

## 3) 기술 스택
- Next.js 16.1.1 (App Router)
- Supabase (PostgreSQL + RLS)
- TanStack Query (React Query)
- Tailwind CSS
- Claude API (카테고리 분류)

## 4) 개발 환경 설정

```bash
# 개발 서버 실행
npm run dev

# 빌드
npm run build

# 타입 체크
npx tsc --noEmit
```

### 환경 변수 (.env)
- `SUPABASE_URL` - Supabase 프로젝트 URL
- `SUPABASE_ANON_KEY` - Supabase anon key
- `ANTHROPIC_API_KEY` - Claude API 키

## 5) 주요 문서
- 제품 요구사항: `PRD_wallet.md`
- 아키텍처: `ARCHITECTURE.md`
- 데이터 모델: `DATA_MODEL.md`
- 리팩토링 기록: `REFACTOR_LOG.md`
- 테스트 계획: `TEST_PLAN.md`

## 6) 최근 변경 이력

### 2026-01-01
- 사용자 커스텀 설정 중앙 관리 시스템 도입
  - `src/lib/customizations/` 모듈 추가
  - 새 커스텀 기능 추가 시 registry.ts에 등록만 하면 초기화에 자동 포함
- 업로드 결과 메시지 개선
- 패턴 저장 옵션 체크박스 추가 (SimilarTransactionsModal)

## 7) 알려진 이슈
- API 키가 잘못 설정된 경우 AI 분류가 "기타"로 fallback됨
- Vercel 배포 시 환경변수 설정 필수
