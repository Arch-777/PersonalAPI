BEGIN;

ALTER TABLE api_keys
	ADD COLUMN IF NOT EXISTS scopes TEXT[] NOT NULL DEFAULT '{}'::text[];

CREATE INDEX IF NOT EXISTS idx_api_keys_scopes_gin
	ON api_keys USING GIN (scopes);

COMMIT;
