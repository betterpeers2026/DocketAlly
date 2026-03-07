-- plan_goals: missing columns from enhancements migration
ALTER TABLE plan_goals ADD COLUMN IF NOT EXISTS dispute_reason TEXT;
ALTER TABLE plan_goals ADD COLUMN IF NOT EXISTS original_goal_snapshot JSONB;
ALTER TABLE plan_goals ADD COLUMN IF NOT EXISTS modified_at TIMESTAMPTZ;

-- plan_checkins: missing columns from enhancements migration
ALTER TABLE plan_checkins ADD COLUMN IF NOT EXISTS expectations_changed BOOLEAN DEFAULT false;
ALTER TABLE plan_checkins ADD COLUMN IF NOT EXISTS expectation_change_detail TEXT;

-- plans: missing columns from enhancements migration
ALTER TABLE plans ADD COLUMN IF NOT EXISTS plan_initiator TEXT;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS employer_stated_reason TEXT;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS stated_consequences TEXT;
