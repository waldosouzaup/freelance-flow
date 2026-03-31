-- Budget Counter Table
-- Tracks sequential budget numbers per user per year
-- Used to generate professional budget IDs like ORC-2026-001

CREATE TABLE IF NOT EXISTS budget_counter (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  last_number INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, year)
);

-- RLS
ALTER TABLE budget_counter ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own budget counters"
  ON budget_counter
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Function to get next budget number atomically
CREATE OR REPLACE FUNCTION get_next_budget_number(p_user_id UUID, p_year INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  next_num INTEGER;
BEGIN
  INSERT INTO budget_counter (user_id, year, last_number)
  VALUES (p_user_id, p_year, 1)
  ON CONFLICT (user_id, year)
  DO UPDATE SET last_number = budget_counter.last_number + 1, updated_at = now()
  RETURNING last_number INTO next_num;
  
  RETURN next_num;
END;
$$;
