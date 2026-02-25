-- Create a table for transactions
CREATE TABLE IF NOT EXISTS transactions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'savings')),
  amount NUMERIC NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  expense_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for user_id to speed up queries
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);

-- Apply to existing databases
ALTER TABLE IF NOT EXISTS transactions
ADD COLUMN IF NOT EXISTS expense_date TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL;

-- Users table to store consent and whitelist status
CREATE TABLE IF NOT EXISTS users (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  telegram_user_id TEXT UNIQUE NOT NULL,
  phone_number TEXT,
  consented BOOLEAN DEFAULT FALSE NOT NULL,
  allowed BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_telegram_user_id ON users(telegram_user_id);
