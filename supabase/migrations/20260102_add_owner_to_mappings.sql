-- category_mappings 테이블에 owner 컬럼 추가
-- 패턴 매핑을 누가 설정했는지 추적하기 위함

-- owner 컬럼 추가 (husband/wife)
ALTER TABLE category_mappings
ADD COLUMN IF NOT EXISTS owner TEXT DEFAULT NULL;

-- merchant_name_mappings 테이블에도 owner 컬럼 추가
ALTER TABLE merchant_name_mappings
ADD COLUMN IF NOT EXISTS owner TEXT DEFAULT NULL;

-- 기존 manual 매핑에 대해 action_history에서 owner 정보 역추적 (선택적)
-- 이 쿼리는 필요시 수동으로 실행
-- UPDATE category_mappings cm
-- SET owner = (
--   SELECT ah.owner
--   FROM action_history ah
--   WHERE ah.entity_id = cm.id::text
--     AND ah.entity_type = 'mapping'
--     AND ah.action_type = 'create'
--   LIMIT 1
-- )
-- WHERE cm.source = 'manual' AND cm.owner IS NULL;
