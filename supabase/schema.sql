-- Wallet Card Dashboard - Database Schema
-- Supabase SQL Editor에서 실행하세요

-- 기존 테이블 삭제 (개발 시에만 사용)
-- DROP TABLE IF EXISTS transactions;

-- 거래 내역 테이블 생성
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_date DATE NOT NULL,
    merchant_name TEXT NOT NULL,
    amount INTEGER NOT NULL,
    category TEXT NOT NULL DEFAULT '기타',
    memo TEXT,
    source_type TEXT NOT NULL,
    owner TEXT NOT NULL CHECK (owner IN ('husband', 'wife')),
    is_deleted BOOLEAN DEFAULT FALSE,
    raw_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성 (조회 성능 최적화)
CREATE INDEX IF NOT EXISTS idx_transactions_date
    ON transactions(transaction_date);

CREATE INDEX IF NOT EXISTS idx_transactions_owner
    ON transactions(owner);

CREATE INDEX IF NOT EXISTS idx_transactions_category
    ON transactions(category);

CREATE INDEX IF NOT EXISTS idx_transactions_deleted
    ON transactions(is_deleted);

CREATE INDEX IF NOT EXISTS idx_transactions_source
    ON transactions(source_type);

-- 복합 인덱스 (월별 조회 최적화)
CREATE INDEX IF NOT EXISTS idx_transactions_month_owner
    ON transactions(date_trunc('month', transaction_date), owner, is_deleted);

-- RLS (Row Level Security) 설정 - 필요시 활성화
-- ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 읽기/쓰기 가능 (간단한 가계부 앱이므로)
-- CREATE POLICY "Allow all operations" ON transactions
--     FOR ALL USING (true) WITH CHECK (true);

-- 중복 체크용 유니크 인덱스 (선택적)
-- 같은 날짜, 가맹점, 금액, 소스의 거래는 중복으로 간주
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_unique
    ON transactions(transaction_date, merchant_name, amount, source_type, owner)
    WHERE is_deleted = FALSE;

COMMENT ON TABLE transactions IS '카드/은행 거래 내역 테이블';
COMMENT ON COLUMN transactions.id IS '고유 식별자 (UUID)';
COMMENT ON COLUMN transactions.transaction_date IS '거래 일자';
COMMENT ON COLUMN transactions.merchant_name IS '가맹점명';
COMMENT ON COLUMN transactions.amount IS '거래 금액 (원)';
COMMENT ON COLUMN transactions.category IS '분류 카테고리';
COMMENT ON COLUMN transactions.memo IS '사용자 메모';
COMMENT ON COLUMN transactions.source_type IS '출처 (현대카드, 삼성카드 등)';
COMMENT ON COLUMN transactions.owner IS '소유자 (husband/wife)';
COMMENT ON COLUMN transactions.is_deleted IS 'Soft Delete 플래그';
COMMENT ON COLUMN transactions.raw_data IS '원본 데이터 (디버깅용)';
COMMENT ON COLUMN transactions.created_at IS '레코드 생성 시간';
