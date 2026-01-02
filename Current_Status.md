# Current_Status.md

마지막 업데이트: 2026-01-02

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
| **4탭 네비게이션** | 지출내역 \| 지출분석 \| 소득내역 \| 소득분석 |
| **소득 차트** | 소득 전용 도넛차트, 스택바차트 (색상 분리) |
| **패턴매핑 개선** | 검색, 남편/아내 표시, 변경 전/후 히스토리 |

### 지원 소스 타입

- **카드:** 현대카드, 롯데카드, 삼성카드, KB국민카드
- **은행:** 우리은행 (소득+지출 통합)
- **상품권:** 온누리상품권, 성남사랑상품권
- **투자:** 한국투자증권 (예정)

### 테스트 현황

- **총 169개 테스트 통과**
- `npm run test:run`으로 실행

---

## 최근 작업 (2026-01-02)

### 소득 탭 기능 완료
- 4탭 네비게이션 구현 (지출내역 | 지출분석 | 소득내역 | 소득분석)
- /income (소득내역), /income/dashboard (소득분석) 페이지 추가
- 소득 카테고리 전용 색상 적용 (파랑, 보라, 주황, 에메랄드, 청록)
- SharedBottomNav 경로 매칭 정확도 개선

### 분석탭 버그 수정
- CategoryPopup에 transactionType 전달하여 소득 팝업 에러 해결
- PieChartCard, StackedBarCard에서 transactionType 전달

### 패턴매핑 관리 UI 개선
- AI 분류 패턴 숨김 (수동 저장 패턴만 표시)
- 이용처명 매핑에 검색 필터링 적용
- 인라인 수정 버튼 제거 (클릭 시 상세 팝업)
- 매핑 owner 필드 추가 (남편/아내 표시)
- 변경 히스토리에 누가/언제/변경전후 명확하게 표시

### DB 마이그레이션 필요 ⚠️
마이그레이션 파일: `supabase/migrations/20260102_add_owner_to_mappings.sql`

**실행 방법 (택 1):**

1. **Supabase Dashboard** (권장)
   - https://supabase.com/dashboard → 프로젝트 선택 → SQL Editor
   - 아래 SQL 실행:
   ```sql
   ALTER TABLE category_mappings ADD COLUMN IF NOT EXISTS owner TEXT DEFAULT NULL;
   ALTER TABLE merchant_name_mappings ADD COLUMN IF NOT EXISTS owner TEXT DEFAULT NULL;
   ```

2. **Supabase CLI**
   ```bash
   npx supabase login  # 브라우저에서 인증
   npx supabase link --project-ref pcxgmvjtqhvkbnmkciho
   npx supabase db push
   ```

3. **Supabase MCP**
   ```bash
   # Claude Code에서 MCP 인증 필요
   # supabase: ⚠ Needs authentication 상태 해결 후 사용 가능
   ```

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
- DB 마이그레이션 미실행 시 owner 필드 null로 표시됨
