# Current Status - Wallet Card Dashboard

**최종 업데이트:** 2025-12-30 (Phase 14 완료)

---

## 1. Current Goal (현재 목표)
Phase 14 UI/UX 개선 완료 - 차트 인터랙션 개선, 설정 메뉴 기능 추가

---

## 2. Completed Tasks (완료된 작업)

### Phase 1: 프로젝트 초기 설정 ✅
- [x] Next.js 14+ (TypeScript, Tailwind CSS, App Router)
- [x] shadcn/ui 컴포넌트
- [x] 필수 패키지 (supabase, recharts, react-query, xlsx)
- [x] Vitest 테스트 환경

### Phase 2: 데이터 파서 구현 (TDD) ✅
- [x] Parser Factory 패턴
- [x] 현대카드 파서 (16 tests)
- [x] 삼성카드 파서 (7 tests)
- [x] 롯데카드 파서 (7 tests)
- [x] KB국민카드 파서 (8 tests)
- [x] 온누리상품권 파서 (11 tests)
- [x] 성남사랑상품권 파서 (15 tests)
- [x] 직접입력 파서

### Phase 3: AI 카테고리 분류 ✅
- [x] Anthropic SDK 설치 (@anthropic-ai/sdk)
- [x] 카테고리 분류 서비스 (lib/classifier)
- [x] 업로드 시 자동 분류
- [x] 재분류 API (/api/classify)
- [x] 대시보드 재분류 버튼
- [x] 카테고리 변경: "미용/기타" → "병원/미용" + "기타" 분리

### Phase 4: 백엔드 API ✅
- [x] Supabase 테이블 (MCP로 생성)
- [x] 쿼리 함수 (CRUD + 집계)
- [x] API Routes (upload, transactions, classify)
- [x] 중복 처리 로직

### Phase 5: 프론트엔드 - 내역 화면 ✅
- [x] React Query 훅 (useTransactions, useUpload)
- [x] TransactionList, TransactionRow
- [x] FileUploader (forwardRef, 스트리밍 진행 상황)
- [x] CategorySheet (바텀시트)
- [x] EditModal (편집/삭제)
- [x] SimilarTransactionsModal (비슷한 거래 일괄 수정)
- [x] 스티키 헤더/필터 통합

### Phase 6: 대시보드 ✅
- [x] useDashboard 훅
- [x] PieChartCard (도넛 차트)
- [x] StackedBarCard (스택 바 차트)
- [x] Dashboard 페이지

### Phase 7: 통합 테스트 및 최적화 ✅
- [x] 단위 테스트 74개 통과
- [x] 기능 테스트 시나리오 통과

### Phase 8: 배포 및 추가 기능 ✅
- [x] Vercel 배포 완료
- [x] 직접입력 엑셀 관리 (다운로드/업로드)
- [x] 파일 관리 UI (다운로드, 삭제)
- [x] 비밀번호 보호 엑셀 파일 처리 (xlsx-populate)
- [x] 비밀번호 입력 다이얼로그 + 힌트
- [x] 비밀번호 저장 기능

### Phase 9: 추가 개선 ✅
- [x] AI 분류 진행 상황 표시 ("AI 분류 중 (3/59)")
- [x] 업로드 취소 및 롤백 기능
- [x] 업로드 후 내역 팝업 (UploadResultPopup)
- [x] 변경 히스토리에서 업로드 클릭 시 내역 팝업
- [x] iOS 스타일 삭제 제스처 (롱프레스, 스와이프)
- [x] EditModal 공유 (업로드 팝업 ↔ 일반 내역 동일 UI)
- [x] 월별 지출 추세 직접 기간 선택 팝업

### Phase 10: PWA 전환 ✅
- [x] next-pwa 패키지 설치 및 설정
- [x] Web App Manifest (manifest.json)
- [x] Service Worker 자동 생성 (캐싱 전략)
- [x] PWA 메타 태그 (iOS/Android 지원)
- [x] 앱 아이콘 생성 (72~512px, Apple Touch Icon)
- [x] usePWAInstall 훅 (설치 프롬프트 관리)
- [x] 설정 메뉴에 "앱 설치" 버튼 추가
- [x] iOS 설치 안내 다이얼로그
- [x] 전체화면 standalone 모드

### Phase 11: 다중 파일 업로드 개선 ✅
- [x] 암호 파일명 정확히 표시 (파일별 개별 처리)
- [x] 비밀번호 입력 후 연속 업로드 (처음부터 재시작 X)
- [x] 건너뛰기 버튼 추가 (취소/건너뛰기/확인)
- [x] 0건 파일 생성 방지 (중복 파일 자동 삭제)
- [x] 같은 패턴 파일 비밀번호 재사용
- [x] OLE2 암호화 파일 지원 (officecrypto-tool)
- [x] 비밀번호 틀려도 건너뛰기 전까지 무한 재시도
- [x] 틀린 비밀번호는 저장하지 않음
- [x] 업로드 결과 팝업 스크롤 수정

### Phase 12: 차트 버그 수정 ✅
- [x] 월별 지출 추세 기간 변경 시 차트 깨지는 버그 수정
- [x] 기간 변경 시 selectedFilter 자동 초기화
- [x] 기간 변경 시 selectedMonth 자동 초기화
- [x] BarChart key prop으로 완전 리렌더링
- [x] 버그 재현 테스트 코드 추가

### Phase 13: 차트 리팩토링 ✅
- [x] 공유 상수 추출 (constants/chart.ts)
- [x] useCategoryCalculation 공유 훅 생성
- [x] CategoryPopup 공유 컴포넌트 생성
- [x] PieChartCard, StackedBarCard 카테고리 동기화
- [x] 레전드 클릭 시 양쪽 차트 하이라이트 동기화
- [x] action_history 테이블 생성 (Supabase)

### Phase 14: UI/UX 개선 ✅
- [x] PieChartCard 도넛 차트 클릭 이벤트 개선
  - 파이 슬라이스 클릭 시 해당 카테고리 팝업
  - 도넛 여백 클릭 시 하이라이트 리셋
  - 중앙(총 지출) 클릭 시 전체 내역 팝업
- [x] PieChartCard 애니메이션 비활성화 (전환 속도 개선)
- [x] StackedBarCard 카테고리별 증감율 표시
- [x] StackedBarCard Y축 상단 여백 추가 (12%)
- [x] CategoryPopup 서브모달 클릭 이벤트 개선
- [x] SettingsDropdown 앱 설치 버튼 추가 (PWA)
- [x] SettingsDropdown 패턴 매핑 관리 기능 추가
- [x] iOS/Desktop 설치 가이드 다이얼로그

**총 테스트: 78개 통과**

---

## 3. 프로젝트 구조

```
wallet_card_dashboard/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── upload/route.ts           # 파일 업로드 + AI 분류
│   │   │   ├── upload-stream/route.ts    # 스트리밍 업로드 + 진행 상황
│   │   │   ├── classify/route.ts         # 재분류 API
│   │   │   ├── mappings/route.ts         # 매핑 관리 API
│   │   │   └── transactions/
│   │   │       ├── route.ts
│   │   │       ├── [id]/route.ts
│   │   │       └── by-file/[fileId]/route.ts
│   │   ├── dashboard/page.tsx
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── dashboard/
│   │   │   ├── PieChartCard.tsx      # 도넛 차트
│   │   │   ├── StackedBarCard.tsx    # 스택 바 차트
│   │   │   └── CategoryPopup.tsx     # 카테고리 상세 팝업 (공유)
│   │   ├── transactions/
│   │   │   ├── TransactionList.tsx
│   │   │   ├── TransactionRow.tsx
│   │   │   ├── FileUploader.tsx
│   │   │   ├── CategorySheet.tsx
│   │   │   ├── EditModal.tsx
│   │   │   ├── SimilarTransactionsModal.tsx
│   │   │   ├── UploadResultPopup.tsx
│   │   │   ├── SwipeableRow.tsx      # iOS 스타일 삭제
│   │   │   └── PasswordDialog.tsx
│   │   ├── settings/
│   │   │   ├── SettingsDropdown.tsx  # 설정 드롭다운 (메인)
│   │   │   ├── SettingsSheet.tsx     # 설정 바텀시트
│   │   │   ├── FileManagement.tsx    # 파일 관리
│   │   │   ├── MappingsManagement.tsx # 매핑 관리
│   │   │   └── HistoryModal.tsx
│   │   └── ui/                     # shadcn/ui
│   ├── constants/
│   │   └── chart.ts                # 차트 색상 상수
│   ├── hooks/
│   │   ├── useDashboard.ts
│   │   ├── useTransactions.ts
│   │   ├── useFiles.ts
│   │   ├── useHistory.ts
│   │   ├── usePWAInstall.ts        # PWA 설치 훅
│   │   └── useCategoryCalculation.ts # 카테고리 계산 공유 훅
│   ├── lib/
│   │   ├── classifier/             # AI 카테고리 분류
│   │   ├── loaders/                # 카드사 파서
│   │   │   ├── hyundai.ts
│   │   │   ├── lotte.ts
│   │   │   ├── samsung.ts
│   │   │   ├── kb.ts
│   │   │   ├── onnuri.ts
│   │   │   ├── seongnam.ts
│   │   │   └── manual.ts
│   │   ├── supabase/
│   │   └── utils/
│   └── types/index.ts
├── public/
│   ├── manifest.json              # PWA 매니페스트
│   └── icons/                     # PWA 아이콘
├── tests/                          # 78 tests
├── sample-data/                    # 샘플 명세서
├── PWA_PLAN.md                    # PWA 개발 계획서
└── Current_Status.md
```

---

## 4. 카테고리 목록

### Set A: AI 자동 분류
| 카테고리 | 설명 |
|---------|------|
| 식료품 | 마트, 슈퍼, 편의점 |
| 외식/커피 | 음식점, 카페, 배달음식 |
| 쇼핑 | 의류, 잡화, 온라인쇼핑 |
| 관리비 | 아파트 관리비, 공과금 |
| 통신/교통 | 휴대폰, 교통비, 주유 |
| 육아 | 어린이집, 학원, 아이용품 |
| 병원/미용 | 병원, 약국, 미용실, 화장품 |
| 기존할부 | 할부 결제 |
| 이자 | 대출/카드 이자 |
| 양육비 | 양육비 이체 |

### Set B: 사용자 수동 변경
- 여행, 부모님, 친구/동료, 경조사/선물, 가전/가구, 기타

---

## 5. Supabase 설정

- **Project ID:** pcxgmvjtqhvkbnmkciho
- **URL:** https://pcxgmvjtqhvkbnmkciho.supabase.co
- **테이블:**
  - `transactions` - 거래 내역
  - `uploaded_files` - 업로드된 파일 정보
  - `category_mappings` - 카테고리 매핑 규칙
  - `merchant_name_mappings` - 이용처명 매핑 규칙
  - `action_history` - 변경 이력 기록

---

## 6. 실행 방법

```bash
# 개발 서버 시작
npm run dev -- -p 3001

# 테스트 실행
npm run test:run

# 타입 체크
npx tsc --noEmit
```

- 메인 (내역): http://localhost:3001
- 대시보드: http://localhost:3001/dashboard

---

## 7. 주요 기능

### 파일 업로드
- 멀티파일 업로드 지원 (파일별 개별 처리)
- 스트리밍 진행 상황 표시 (AI 분류 N/M)
- 취소 및 롤백 기능
- 비밀번호 보호 파일 지원 (ZIP + OLE2 암호화)
- 비밀번호 건너뛰기 옵션 (틀려도 재시도 가능)
- 같은 패턴 파일 비밀번호 자동 재사용
- 0건 파일 자동 삭제 (중복 방지)

### 거래 내역 편집
- 탭하여 상세 편집 (EditModal)
- 카테고리 바로 변경 (CategorySheet)
- iOS 스타일 삭제 제스처
- 비슷한 거래 일괄 수정

### 업로드 결과 팝업
- 업로드 완료 후 해당 파일 내역만 표시
- 변경 히스토리에서도 접근 가능
- EditModal과 동일한 편집 경험

### PWA (Progressive Web App)
- 홈 화면에 앱으로 설치 가능
- 전체화면 모드 (주소창 숨김)
- 오프라인 캐싱 지원
- iOS: Safari "홈 화면에 추가" 안내
- Android/Desktop: 네이티브 설치 프롬프트

---

## 8. 배포

- **Production URL:** https://walletcarddashboard.vercel.app
- **GitHub:** https://github.com/terryum/wallet-card-dashboard
- **배포 방식:** Git Push → Vercel 자동 배포

---

*마지막 업데이트: 2025-12-30 - UI/UX 개선, 설정 메뉴 기능 추가, 차트 인터랙션 개선*
