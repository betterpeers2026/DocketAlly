-- ============================================================
-- Case-Record junction table for many-to-many linking
-- ============================================================

CREATE TABLE case_records (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id     UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  record_id   UUID NOT NULL REFERENCES records(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (case_id, record_id)
);

-- Row Level Security
ALTER TABLE case_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own case_records"
  ON case_records FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own case_records"
  ON case_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own case_records"
  ON case_records FOR DELETE
  USING (auth.uid() = user_id);
