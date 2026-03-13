BEGIN;

-- Required extensions for UUID generation, vector search, and text/page indexing.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Optional: helpful for low-level page/index diagnostics.
DO $$
BEGIN
	CREATE EXTENSION IF NOT EXISTS pageinspect;
EXCEPTION
	WHEN OTHERS THEN
		RAISE NOTICE 'pageinspect extension could not be created (often restricted on managed Postgres).';
END $$;

CREATE TABLE IF NOT EXISTS users (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	email VARCHAR(320) NOT NULL UNIQUE,
	full_name VARCHAR(255),
	hashed_password VARCHAR(255) NOT NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS connectors (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	platform TEXT NOT NULL,
	platform_email TEXT,
	encrypted_access_token TEXT NOT NULL,
	encrypted_refresh_token TEXT,
	token_expires_at TIMESTAMPTZ,
	status TEXT NOT NULL DEFAULT 'connected',
	sync_cursor TEXT,
	last_synced TIMESTAMPTZ,
	error_message TEXT,
	metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
	created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	CONSTRAINT uq_connectors_user_platform UNIQUE (user_id, platform)
);

CREATE TABLE IF NOT EXISTS items (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	type TEXT NOT NULL,
	source TEXT NOT NULL,
	source_id TEXT NOT NULL,
	title TEXT,
	sender_name TEXT,
	sender_email TEXT,
	content TEXT,
	summary TEXT,
	metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
	item_date TIMESTAMPTZ,
	file_path TEXT,
	embedding vector(1536),
	content_tsv tsvector GENERATED ALWAYS AS (
		to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, ''))
	) STORED,
	created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	CONSTRAINT uq_items_user_source_source_id UNIQUE (user_id, source, source_id)
);

CREATE TABLE IF NOT EXISTS api_keys (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	key_prefix TEXT NOT NULL,
	key_hash TEXT NOT NULL UNIQUE,
	name TEXT,
	agent_type TEXT,
	allowed_channels TEXT[] NOT NULL DEFAULT '{}'::text[],
	last_used_at TIMESTAMPTZ,
	expires_at TIMESTAMPTZ,
	revoked_at TIMESTAMPTZ,
	created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_sessions (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	channel TEXT NOT NULL DEFAULT 'dashboard',
	created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_messages (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
	role TEXT NOT NULL,
	content TEXT NOT NULL,
	sources JSONB NOT NULL DEFAULT '[]'::jsonb,
	created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS access_logs (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id UUID REFERENCES users(id) ON DELETE SET NULL,
	api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
	request_id TEXT,
	method TEXT NOT NULL,
	path TEXT NOT NULL,
	status_code INTEGER NOT NULL,
	latency_ms INTEGER,
	client_ip TEXT,
	user_agent TEXT,
	created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Core lookup and feed indexes.
CREATE INDEX IF NOT EXISTS idx_connectors_user_id ON connectors(user_id);
CREATE INDEX IF NOT EXISTS idx_connectors_platform ON connectors(platform);
CREATE INDEX IF NOT EXISTS idx_items_user_type_date ON items(user_id, type, item_date DESC);
CREATE INDEX IF NOT EXISTS idx_items_source ON items(source);
CREATE INDEX IF NOT EXISTS idx_items_metadata_gin ON items USING GIN (metadata jsonb_path_ops);
CREATE INDEX IF NOT EXISTS idx_items_content_tsv ON items USING GIN (content_tsv);
CREATE INDEX IF NOT EXISTS idx_items_content_trgm ON items USING GIN (content gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_created ON chat_messages(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_access_logs_created_at ON access_logs(created_at DESC);

-- Vector index for semantic retrieval. Tune lists based on row count and workload.
CREATE INDEX IF NOT EXISTS idx_items_embedding_ivfflat
	ON items USING ivfflat (embedding vector_cosine_ops)
	WITH (lists = 100)
	WHERE embedding IS NOT NULL;

COMMIT;
