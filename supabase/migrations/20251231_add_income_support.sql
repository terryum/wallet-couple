-- 소득 관리 기능 추가를 위한 마이그레이션
-- 거래 유형 컬럼 추가 (지출/소득 구분)

-- 1. transaction_type 컬럼 추가
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS transaction_type TEXT NOT NULL DEFAULT 'expense';

-- 2. CHECK 제약조건 추가
ALTER TABLE transactions
ADD CONSTRAINT transactions_type_check CHECK (transaction_type IN ('expense', 'income'));

-- 3. 인덱스 추가 (월별 수지 계산 최적화)
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_date_type ON transactions(transaction_date, transaction_type);

-- 4. 코멘트 추가
COMMENT ON COLUMN transactions.transaction_type IS '거래 유형: expense(지출), income(소득)';
