-- Add onboarding_completed flag to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;

-- Mark all existing users as completed so they skip onboarding
UPDATE profiles SET onboarding_completed = true;
