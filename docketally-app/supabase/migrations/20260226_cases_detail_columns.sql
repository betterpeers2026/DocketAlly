-- ============================================================
-- Add detail columns to cases table for case info view
-- ============================================================

ALTER TABLE cases ADD COLUMN IF NOT EXISTS employer TEXT;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS role TEXT;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS key_people TEXT;
