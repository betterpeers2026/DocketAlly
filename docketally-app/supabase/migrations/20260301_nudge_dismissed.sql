-- Add column for tracking when the record-nudge banner was last dismissed
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS nudge_dismissed_at timestamptz DEFAULT NULL;
