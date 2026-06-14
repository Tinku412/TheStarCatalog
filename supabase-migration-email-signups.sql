-- Ensure landing page email signups work (run once in Supabase SQL Editor)

CREATE TABLE IF NOT EXISTS sc_landing_email_signups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    source TEXT DEFAULT 'landing_page',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT sc_landing_email_valid CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

ALTER TABLE sc_landing_email_signups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sc_landing_email_anon_insert" ON sc_landing_email_signups;
CREATE POLICY "sc_landing_email_anon_insert"
    ON sc_landing_email_signups FOR INSERT
    WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_sc_landing_email_created_at ON sc_landing_email_signups(created_at DESC);
