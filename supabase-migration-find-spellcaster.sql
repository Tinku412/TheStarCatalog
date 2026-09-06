-- ============================================================================
-- Find Spellcaster requests (seeker matching intake)
-- ============================================================================
-- Run once in the Supabase SQL Editor.
-- ============================================================================

CREATE TABLE IF NOT EXISTS sc_find_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Seeker identity
    full_name TEXT NOT NULL,

    -- What they need
    service_type TEXT NOT NULL,
    service_type_other TEXT DEFAULT NULL,
    requirement_details TEXT NOT NULL,

    -- Optional preferences
    budget TEXT DEFAULT NULL,
    practitioner_type TEXT DEFAULT NULL,
    practitioner_type_other TEXT DEFAULT NULL,
    timing TEXT DEFAULT NULL,

    -- Contact
    contact_email TEXT NOT NULL,
    contact_phone TEXT DEFAULT NULL,
    preferred_contact TEXT DEFAULT NULL,

    -- Workflow
    status TEXT NOT NULL DEFAULT 'new',
    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT sc_find_requests_email_valid
        CHECK (contact_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT sc_find_requests_status_valid
        CHECK (status IN ('new', 'in_progress', 'matched', 'closed'))
);

ALTER TABLE sc_find_requests ENABLE ROW LEVEL SECURITY;

-- Anyone can submit a request (public form)
DROP POLICY IF EXISTS "sc_find_requests_anon_insert" ON sc_find_requests;
CREATE POLICY "sc_find_requests_anon_insert"
    ON sc_find_requests FOR INSERT
    WITH CHECK (true);

-- Authenticated users can read (for internal review while signed in)
DROP POLICY IF EXISTS "sc_find_requests_auth_read" ON sc_find_requests;
CREATE POLICY "sc_find_requests_auth_read"
    ON sc_find_requests FOR SELECT
    TO authenticated
    USING (true);

CREATE INDEX IF NOT EXISTS idx_sc_find_requests_created_at
    ON sc_find_requests(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sc_find_requests_status
    ON sc_find_requests(status);
