-- ============================================================
-- Add case_types array column for multi-select case types
-- ============================================================

ALTER TABLE cases ADD COLUMN IF NOT EXISTS case_types TEXT[] DEFAULT '{}';

-- Copy existing single values into the array
UPDATE cases
  SET case_types = ARRAY[case_type]
  WHERE case_type IS NOT NULL AND case_type != '';
