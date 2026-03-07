ALTER TABLE profiles ADD COLUMN IF NOT EXISTS checklist_dismissed BOOLEAN DEFAULT false;
