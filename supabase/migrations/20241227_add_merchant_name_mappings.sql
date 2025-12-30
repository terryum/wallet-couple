-- 이용처명 매핑 테이블
-- 사용자가 수정한 이용처명을 저장하여 향후 업로드 시 자동 적용
CREATE TABLE IF NOT EXISTS merchant_name_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_pattern TEXT NOT NULL UNIQUE,  -- 원본 이용처명의 패턴 (정규화된)
  preferred_name TEXT NOT NULL,           -- 사용자가 선호하는 이름
  example_original TEXT,                   -- 원본 이용처명 예시
  match_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_merchant_name_mappings_pattern ON merchant_name_mappings(original_pattern);

-- 업데이트 시 updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_merchant_name_mappings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_merchant_name_mappings_updated_at ON merchant_name_mappings;
CREATE TRIGGER trigger_merchant_name_mappings_updated_at
  BEFORE UPDATE ON merchant_name_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_merchant_name_mappings_updated_at();
