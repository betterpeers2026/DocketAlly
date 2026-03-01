-- Add columns for getting-started checklist and education card dismissals
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_checklist jsonb DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS dismissed_edu_cards jsonb DEFAULT '[]';

-- Mark all existing users so they skip the getting-started checklist
UPDATE profiles SET onboarding_checklist = '{"completed": true}' WHERE onboarding_completed = true;
