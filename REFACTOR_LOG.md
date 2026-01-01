# REFACTOR_LOG.md

## 완료
- ingestion 모듈화
- services/repositories 분리
- 스트리밍 SSE 업로드 구현
- 카테고리 분류 로직 분리
- 청구 비교/대시보드 데이터 분리

## 최근 추가 (2026-01-01)
- SUPABASE_ANON_KEY 환경변수 인식 추가 (src/lib/supabase/client.ts)
- 사용자 커스텀 설정 중앙 관리 시스템 도입 (src/lib/customizations/)
  - registry.ts: 모든 커스텀 설정 등록 및 관리
  - service.ts: 조회/삭제 로직
- 업로드 결과 메시지 개선 (파일 수/중복 정보 표시)
- 패턴 저장 옵션 체크박스 추가 (SimilarTransactionsModal)

## 향후 계획
- 테스트 커버리지 확대
- 성능 최적화
- sample-data 활용 테스트
