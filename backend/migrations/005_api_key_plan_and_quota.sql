BEGIN;

ALTER TABLE api_keys
	ADD COLUMN IF NOT EXISTS plan_tier TEXT NOT NULL DEFAULT 'free',
	ADD COLUMN IF NOT EXISTS monthly_quota INTEGER NOT NULL DEFAULT 5000,
	ADD COLUMN IF NOT EXISTS quota_used INTEGER NOT NULL DEFAULT 0,
	ADD COLUMN IF NOT EXISTS quota_window_start TIMESTAMPTZ,
	ADD COLUMN IF NOT EXISTS quota_window_end TIMESTAMPTZ;

UPDATE api_keys
SET
	plan_tier = COALESCE(NULLIF(plan_tier, ''), 'free'),
	monthly_quota = CASE
		WHEN monthly_quota IS NULL OR monthly_quota <= 0 THEN 5000
		ELSE monthly_quota
	END,
	quota_used = COALESCE(quota_used, 0)
WHERE
	plan_tier IS NULL
	OR plan_tier = ''
	OR monthly_quota IS NULL
	OR monthly_quota <= 0
	OR quota_used IS NULL;

CREATE INDEX IF NOT EXISTS idx_api_keys_plan_tier ON api_keys(plan_tier);
CREATE INDEX IF NOT EXISTS idx_api_keys_quota_window_end ON api_keys(quota_window_end);

COMMIT;
