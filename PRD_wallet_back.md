# Product Requirement Document (PRD): Wallet Card Dashboard - Backend & Data

## 1. 개요 (Overview)
* **문서명:** PRD_wallet_back.md
* **목적:** 데이터 수집, 파싱, 저장(Supabase), AI 분류(Claude)를 포함한 백엔드 아키텍처 및 로직 정의
* **관련 문서:** `PRD_wallet.md` (상위), `PRD_wallet_dataloader.md` (하위/데이터 상세)

## 2. 기술 스택 및 인프라 (Tech Stack)
* **Database:** Supabase (PostgreSQL)
    * **관리 방식:** SQL Editor 직접 입력 대신 MCP(Model Context Protocol)를 통해 AI가 직접 테이블 생성 및 관리 수행.
    * **연동:** `.env`의 Key 활용.
* **Server/Hosting:** Vercel (Next.js API Routes 또는 Server Actions 권장)
* **AI Engine:** Anthropic Claude API (카테고리 자동 분류용)
* **Testing:** Jest 또는 Vitest (각 단계별 TDD 수행)

## 3. 데이터베이스 설계 (Database Schema)
Supabase에 생성할 주요 테이블 구조는 다음과 같다.

### 3.1. Transactions (거래 내역 테이블)
모든 카드사, 은행, 상품권의 내역이 파싱되어 저장되는 메인 테이블.

| Column Name | Type | Description | Note |
| :--- | :--- | :--- | :--- |
| `id` | UUID | Primary Key | |
| `transaction_date` | Date | 거래 일시 | 시분초가 없으면 00:00:00 처리 |
| `merchant_name` | Text | 이용처 (가맹점명) | |
| `amount` | Integer | 금액 | |
| `category` | Text | 분류 | AI 또는 사용자 지정 값 |
| `memo` | Text | 메모 | 사용자 수기 입력 (Default: null) |
| `source_type` | Text | 출처 | 예: '현대카드', '토스뱅크', '온누리' |
| `is_deleted` | Boolean | 삭제 여부 | Soft Delete 구현용 (Default: false) |
| `raw_data` | JSONB | 원본 데이터 | 디버깅용 원본 행 데이터 저장 |
| `created_at` | Timestamp | 생성일 | |

## 4. 데이터 수집 및 파싱 전략 (Data Ingestion Strategy)

### 4.1. 파일 업로드 핸들링
* 사용자는 한 번에 여러 개(Multi-file)의 파일(Excel, PDF 등)을 업로드한다.
* 백엔드는 각 파일을 순회하며 적절한 **Parser**를 찾아 데이터를 추출한다.

### 4.2. 파싱 로직 (Parser Factory)
각 금융사별로 포맷이 다르므로, **Strategy Pattern**을 사용하여 유연하게 대응한다. 구체적인 파싱 규칙은 `PRD_wallet_dataloader.md`를 따른다.

1.  **Specific Parsers (전용 파서):**
    * 현대카드, 롯데카드, 삼성카드, KB카드, 토스뱅크카드
    * 지역화폐(온누리, 성남사랑), 주요 은행 등
    * *동작:* 파일명이나 헤더 내용을 감지하여 해당 로직 수행.
2.  **General Parser (일반 파서 - Fallback):**
    * 특정 카드사 로직에 해당하지 않을 경우 실행.
    * *동작:* LLM(Claude)을 활용하거나 일반적인 CSV/Excel 구조(날짜/상호/금액 패턴)를 분석하여 데이터를 추출하도록 시도.

## 5. 카테고리 분류 로직 (AI Classification)

### 5.1. 분류 프로세스
1.  데이터 파싱이 완료되면 `merchant_name`과 `amount`를 추출한다.
2.  Claude API에 해당 내역을 전송하여 **1차 카테고리(Set A)** 중 하나를 추천받는다.
3.  DB `category` 컬럼에 추천받은 값을 저장한다.

### 5.2. 카테고리 리스트
**[Set A: AI 자동 분류 후보군]**
* 식료품
* 외식/커피
* 쇼핑
* 관리비
* 통신/교통
* 육아
* 병원/미용 (병원, 약국, 의료비, 미용실, 피부관리, 네일, 화장품)
* 기존할부
* 이자
* 양육비

**[Set B: 사용자 수동 변경 전용]** (AI는 이 값으로 초기 분류하지 않음, 사용자가 수정 시 선택 가능)
* 여행
* 부모님
* 친구/동료
* 경조사/선물
* 가전/가구
* 기타 (AI 분류 실패 시 기본값)

## 6. API 및 기능 명세 (API Specs)

### 6.1. 데이터 업로드 (POST /api/upload)
* **Input:** Multi-part Form Data (Files)
* **Logic:** 파싱 -> AI 분류 -> DB Bulk Insert
* **Response:** 성공/실패 건수 리턴

### 6.2. 내역 조회 (GET /api/transactions)
* **Query Params:** `month` (YYYY-MM), `sort`, `filter`
* **Logic:** `is_deleted`가 false인 내역 조회

### 6.3. 내역 수정/삭제 (PATCH /api/transactions/:id)
* **기능:** 카테고리 변경, 메모 수정, 삭제(Soft Delete)
* **Logic:**
    * 삭제 요청 시 `is_deleted = true`로 업데이트 (행을 완전히 지우지 않음).
    * 카테고리 변경 시 Set A + Set B 전체 목록 중 선택 값으로 업데이트.

### 6.4. 비슷한 거래 조회 (GET /api/transactions/similar)
* **Query Params:** `merchant` (이용처명), `exclude_id` (제외할 ID)
* **Logic:**
    * 이용처명에서 주요 키워드 추출 (Stopwords 필터링).
    * Stopwords: 회사명 접미사(주식회사, 유한회사, 한국, 코리아), 결제 관련(페이, 카드, 결제), 도시명(서울, 부산 등).
    * ILIKE 검색으로 비슷한 이용처 조회.
* **Response:** 비슷한 거래 목록 + 검색에 사용된 패턴.

### 6.5. 일괄 수정 (PATCH /api/transactions/bulk)
* **Input:** `ids` (ID 배열), `category` 또는 `merchant_name`
* **Logic:**
    * 여러 거래를 한 번에 카테고리 또는 이용처명 변경.
    * `save_mapping: true` 시 이용처-카테고리 매핑 저장.
* **Response:** 수정된 건수.

### 6.6. 카테고리 매핑 저장 (POST /api/mappings)
* **Input:** `merchantName`, `category`
* **Logic:** 수동 분류 결과를 DB에 저장 → 이후 업로드 시 자동 분류에 활용.

## 7. 개발 워크플로우 (Development & Testing)

### Phase 1: 파서 및 DB 로딩 (Backend Only)
* 카드사별 샘플 데이터를 이용해 파싱 함수 단위 테스트 (Jest) 작성.
* Supabase MCP를 통해 테이블 생성 및 연결 확인.
* `Parser` -> `AI Classification` -> `Supabase Insert` 파이프라인 검증.

### Phase 2: 프론트엔드 연동 (Integration)
* (Phase 1 완료 후 진행) API Endpoint 생성 및 프론트엔드 연결 테스트.

### Phase 3: 서빙 및 배포
* Vercel 배포 및 환경변수 설정.