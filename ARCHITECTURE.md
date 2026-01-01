# ARCHITECTURE.md

## 레이어 구조
- UI (Next.js App Router)
- API Route
- Service
- Repository
- Supabase (PostgreSQL)

## 업로드 파이프라인
1) 파일 드롭/선택 → upload-stream으로 SSE 업로드
2) 파싱 (loaders)
3) 변환/정규화 (ingestion)
4) 분류 (classifier)
5) DB 저장 + action history 기록
6) 결과 스트리밍 반환

## 캐싱/무효화
- TanStack Query로 서버/클라이언트 캐싱
- 거래내역 변경 시 관련 쿼리 invalidate

## 주요 모듈
| 디렉토리 | 역할 |
|---------|------|
| src/lib/ingestion/ | 청구월 추출, 분류 준비, 거래 변환 |
| src/lib/classifier/ | AI 기반 카테고리 분류 |
| src/lib/customizations/ | 사용자 커스텀 설정 레지스트리 |
| src/lib/services/ | 비즈니스 로직 |
| src/lib/repositories/ | DB 접근 래퍼 |

## 확장 가이드
- 새 카드사: loader 추가
- 새 차트: dashboard transform 추가
- 새 UI 뷰: query + card 추가
- 새 커스텀 설정: customizations/registry.ts에 등록
