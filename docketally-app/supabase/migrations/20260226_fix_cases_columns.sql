-- ============================================================
-- Fix cases table: rename case_name to name, drop people column
-- ============================================================

ALTER TABLE cases RENAME COLUMN case_name TO name;
ALTER TABLE cases DROP COLUMN IF EXISTS people;
