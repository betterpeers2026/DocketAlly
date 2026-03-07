-- plans: context fields
ALTER TABLE plans ADD COLUMN IF NOT EXISTS plan_initiator TEXT;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS employer_stated_reason TEXT;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS stated_consequences TEXT;

-- plan_goals: dispute and modified snapshot
ALTER TABLE plan_goals ADD COLUMN IF NOT EXISTS dispute_reason TEXT;
ALTER TABLE plan_goals ADD COLUMN IF NOT EXISTS original_goal_snapshot JSONB;
ALTER TABLE plan_goals ADD COLUMN IF NOT EXISTS modified_at TIMESTAMPTZ;

-- plan_checkins: expectation shift tracking
ALTER TABLE plan_checkins ADD COLUMN IF NOT EXISTS expectations_changed BOOLEAN DEFAULT false;
ALTER TABLE plan_checkins ADD COLUMN IF NOT EXISTS expectation_change_detail TEXT;
