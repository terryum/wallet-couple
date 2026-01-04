# PRD: Wallet Card Dashboard

> 부부의 금융 거래 내역을 통합하여 지출/소득을 분석하는 모바일 웹 앱

## 1. 개요

| 항목 | 내용 |
|------|------|
| 프로젝트명 | wallet_card_dashboard |
| 버전 | v3.0 |
| 배포 URL | https://wallet-terry-lynn.vercel.app |
| 타겟 유저 | 부부 2인 (향후 SaaS 확장) |
| 플랫폼 | 모바일 웹 + PWA |

## 2. 핵심 가치

1. **데이터의 완전성** - 자동 연동 누락 방지를 위해 명세서 직접 업로드
2. **유연한 편집** - AI 1차 분류 후 사용자가 최종 검증/수정
3. **직관적인 시각화** - 카테고리별/월별 시각화로 흐름 파악

---

## 3. 기능 명세

### 3.1 지출 관리 (Expense) ✅

| 기능 | 설명 | 상태 |
|------|------|------|
| 파일 업로드 | 카드사/은행 명세서 파싱 | ✅ |
| AI 분류 | Claude API 기반 자동 카테고리 분류 | ✅ |
| 거래 CRUD | 조회/수정/삭제/수동 추가 | ✅ |
| 일괄 수정 | 비슷한 거래 일괄 카테고리 변경 | ✅ |
| 대시보드 | 월별 지출 분석, 카테고리별 비중 | ✅ |

### 3.2 소득 관리 (Income) ✅

| 기능 | 설명 | 상태 |
|------|------|------|
| 통장 내역 파싱 | 우리은행 입금 내역 → 소득 | ✅ |
| 소득 카테고리 | 급여, 상여, 정부/환급, 강연/도서, 금융소득, 기타소득 | ✅ |
| 소득 대시보드 | 월별 소득 분석 | ✅ |
| 5탭 네비게이션 | 지출 \| 소득 \| 분석 \| 가계 \| 투자 | ✅ |
| 소득 전용 차트 | 도넛차트, 스택바차트 (전용 색상) | ✅ |

### 3.3 가계분석 (Household) ✅

| 기능 | 설명 | 상태 |
|------|------|------|
| 듀얼 도넛차트 | 소득/지출 비중 동시 표시 | ✅ |
| 통합 추세 차트 | 소득 막대(↑) + 지출 막대(↓) + 손익선 | ✅ |
| 카테고리 분석 | 소득/지출 카테고리별 막대차트 | ✅ |
| 월 동기화 | 선택월 변경 시 모든 차트 끝월 동기화 | ✅ |
| 손익선 확장 | 전후 1개월 데이터로 경계 잘림 효과 | ✅ |

### 3.4 투자 관리 (Investment) 🔜

| 기능 | 설명 | 상태 |
|------|------|------|
| 확정 수익 | 배당금, 매도차익, 이자 수익 | 🔜 예정 |
| 잠재 수익 | 미실현 손익 (구입가 vs 현재가) | 🔜 예정 |
| 포트폴리오 | 보유 종목, 수익률 현황 | 🔜 예정 |
| KIS API 연동 | 한국투자증권 Open API | 🔜 예정 |

---

## 4. 데이터 로더

### 지원 소스

| 유형 | 소스 | 로더 파일 |
|------|------|----------|
| 카드 | 현대카드 | `hyundai.ts` |
| 카드 | 롯데카드 | `lotte.ts` |
| 카드 | 삼성카드 | `samsung.ts` |
| 카드 | KB국민카드 | `kb.ts` |
| 은행 | 우리은행 | `woori.ts` |
| 상품권 | 온누리상품권 | `onnuri.ts` |
| 상품권 | 성남사랑상품권 | `seongnam.ts` |
| 투자 | 한국투자증권 | `kis.ts` (예정) |

### 로더 구조

```
src/lib/loaders/
├── index.ts          # Parser Factory
├── base.ts           # BaseLoader 추상 클래스
├── hyundai.ts        # 현대카드
├── lotte.ts          # 롯데카드
├── samsung.ts        # 삼성카드
├── kb.ts             # KB국민카드
├── woori.ts          # 우리은행 (소득+지출)
├── onnuri.ts         # 온누리상품권
├── seongnam.ts       # 성남사랑상품권
└── kis.ts            # 한국투자증권 (예정)
```

### 현대카드 금액 추출 우선순위

1. 인덱스 6 (예상적립/할인) - 이번 달 결제금액
2. 인덱스 7 (결제원금) - 소계/합계 행
3. 뒤에서부터 찾기 - 컬럼 개수 다를 경우
4. 가맹점명에서 추출 - 최후 수단

### 우리은행 거래 분류

- **소득:** 맡기신금액 > 0 → `transaction_type: 'income'`
- **지출:** 찾으신금액 > 0 → `transaction_type: 'expense'`
- **제외:** 본인/배우자 이체, 카드결제, 상품권충전

---

## 5. 프론트엔드

### 화면 구성

| 화면 | 경로 | 설명 |
|------|------|------|
| 홈 | `/` | 가계분석으로 리다이렉트 |
| 지출내역 | `/expense` | 월별 지출 목록, 필터, 검색 |
| 소득내역 | `/income` | 월별 소득 목록 |
| 지출분석 | `/dashboard` | 지출 분석, 차트 |
| 가계분석 | `/household` | 소득/지출 통합 분석 (기본 화면) |
| 투자 | `/investment` | 투자 현황 (예정) |
| 설정 | 드롭다운 | 매핑 관리, 파일 관리 |

### 주요 컴포넌트

| 컴포넌트 | 역할 |
|---------|------|
| `FileUploader` | 파일 드래그앤드롭, 업로드 |
| `TransactionList` | 거래 목록 표시 |
| `EditModal` | 거래 수정 모달 |
| `SimilarTransactionsModal` | 비슷한 거래 일괄 수정 |
| `PieChartCard` | 카테고리별 지출 비중 |
| `StackedBarCard` | 월별 지출 추이 |
| `DualPieChartCard` | 소득/지출 듀얼 도넛차트 |
| `IncomeExpenseBarCard` | 통합 추세 + 카테고리 분석 |
| `DataPrefetcher` | 앱 레벨 프리페칭 |

### 성능 최적화

| 기능 | 설명 |
|------|------|
| 프리페칭 | 앱 로드 시 인접 월 데이터 미리 로드 |
| 사용자 클릭 우선순위 | 클릭 시 진행 중인 프리페칭 즉시 취소 |
| 추세 캐싱 | localStorage 기반 stale-while-revalidate |
| API 병렬화 | billing-comparison 등 순차 호출 → 병렬화 |
| 점진적 로딩 | 도넛차트 완료 후 추세 데이터 로드 |

---

## 6. 백엔드

### API 엔드포인트

| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `/api/upload` | POST | 파일 업로드 + 파싱 + AI 분류 |
| `/api/upload-stream` | POST | SSE 스트리밍 업로드 |
| `/api/classify` | POST | 재분류 |
| `/api/transactions` | GET | 월별 거래 조회 |
| `/api/transactions/:id` | PATCH/DELETE | 거래 수정/삭제 |
| `/api/mappings` | GET/POST/DELETE | 매핑 관리 |

### 데이터베이스

```sql
-- 거래 내역
transactions (id, transaction_date, merchant_name, amount, category,
              source_type, owner, transaction_type, is_deleted, file_id)

-- 매핑
category_mappings (pattern, category, source, match_count, owner)
merchant_name_mappings (original_pattern, preferred_name, match_count, owner)

-- 포트폴리오 (예정)
portfolio (id, symbol, name, quantity, purchase_price, current_price,
           unrealized_gain, owner)
```

---

## 7. 확장 계획

### Phase 1: 소득 대시보드 강화
- 소득 원천별 분석 차트
- 월별/연별 소득 추이

### Phase 2: 투자 UI (더미데이터)
- 확정 수익 표시
- 잠재 수익 표시
- 포트폴리오 현황

### Phase 3: portfolio 테이블 구현
- 보유 종목 관리
- 수익률 계산

### Phase 4: KIS API 연동
- 한국투자증권 Open API
- 실시간 시세 조회
- 자동 포트폴리오 동기화

### Phase 5: SaaS 전환
- 다중 커플(워크스페이스) 지원
- 커플별 커스텀 설정 분리
- 인증/권한 시스템

---

## 8. 테스트

| 영역 | 테스트 수 | 상태 |
|------|----------|------|
| 현대카드 로더 | 16개 | ✅ |
| 삼성카드 로더 | 7개 | ✅ |
| 롯데카드 로더 | 7개 | ✅ |
| KB국민카드 로더 | 8개 | ✅ |
| 온누리상품권 로더 | 11개 | ✅ |
| 성남사랑상품권 로더 | 15개 | ✅ |
| 소득 기능 통합 | 26개 | ✅ |
| SharedBottomNav | 9개 | ✅ |
| 차트/대시보드 | 37개 | ✅ |
| 서비스/유틸리티 | 33개 | ✅ |
| **총계** | **169개** | ✅ |

---

*마지막 업데이트: 2026-01-04*
