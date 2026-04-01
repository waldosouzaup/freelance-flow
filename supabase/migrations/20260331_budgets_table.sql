-- Budgets history table
-- Stores full budget data as JSONB for identical PDF regeneration

CREATE TABLE IF NOT EXISTS budgets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  budget_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'aguardando',
  client_name TEXT NOT NULL,
  client_email TEXT,
  project_name TEXT NOT NULL,
  total_value NUMERIC NOT NULL DEFAULT 0,
  budget_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own budgets"
  ON budgets
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_status ON budgets(user_id, status);
