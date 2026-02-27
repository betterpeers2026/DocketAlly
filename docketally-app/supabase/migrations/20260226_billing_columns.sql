-- ============================================================
-- Billing columns for subscription management
-- ============================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trial',
  ADD COLUMN IF NOT EXISTS subscription_plan TEXT,
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMPTZ;

-- Update signup trigger to set trial_ends_at on new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, subscription_status, trial_ends_at)
  VALUES (NEW.id, NEW.email, 'trial', NOW() + INTERVAL '7 days');
  RETURN NEW;
END;
$$;

-- Backfill existing users with 7-day trial
UPDATE profiles
SET subscription_status = 'trial',
    trial_ends_at = NOW() + INTERVAL '7 days'
WHERE subscription_status IS NULL;
