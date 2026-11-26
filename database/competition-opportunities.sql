CREATE TABLE IF NOT EXISTS competition_opportunities (
    id BIGSERIAL PRIMARY KEY,
    source TEXT NOT NULL,
    source_id TEXT NOT NULL,
    title TEXT NOT NULL,
    organizer TEXT,
    description TEXT NOT NULL DEFAULT '',
    url TEXT,
    prize TEXT,
    deadline TIMESTAMPTZ,
    participants INTEGER,
    tags JSONB NOT NULL DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closing', 'closed')),
    location TEXT,
    format TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (source, source_id)
);

CREATE INDEX IF NOT EXISTS competition_opportunities_status_deadline_idx
    ON competition_opportunities (status, deadline);

CREATE INDEX IF NOT EXISTS competition_opportunities_source_idx
    ON competition_opportunities (source);

ALTER TABLE competition_opportunities
    ALTER COLUMN url DROP NOT NULL;
