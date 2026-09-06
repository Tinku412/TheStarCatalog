-- ============================================================================
-- Leads & analytics dashboard — allow admin read access
-- ============================================================================
-- Run once in the Supabase SQL Editor.
-- Restricts SELECT on sensitive lead/analytics tables to the site admin UID.
-- ============================================================================

-- Ensure inquiries table exists (from profile.js comments)
CREATE TABLE IF NOT EXISTS sc_inquiries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID NOT NULL,
    full_name TEXT NOT NULL,
    date_of_birth DATE,
    email TEXT NOT NULL,
    budget TEXT,
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE sc_inquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inq_insert" ON sc_inquiries;
CREATE POLICY "inq_insert" ON sc_inquiries
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "sc_inquiries_admin_read" ON sc_inquiries;
CREATE POLICY "sc_inquiries_admin_read" ON sc_inquiries
  FOR SELECT TO authenticated
  USING (auth.uid() = 'a6316b86-f6dd-4fee-9449-b125eafd97e8');

CREATE INDEX IF NOT EXISTS idx_sc_inquiries_created_at ON sc_inquiries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sc_inquiries_profile_id ON sc_inquiries(profile_id);

-- Analytics: admin read
ALTER TABLE sc_analytics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sc_analytics_admin_read" ON sc_analytics;
CREATE POLICY "sc_analytics_admin_read" ON sc_analytics
  FOR SELECT TO authenticated
  USING (auth.uid() = 'a6316b86-f6dd-4fee-9449-b125eafd97e8');

-- Find requests: tighten read to admin (keep public insert)
DROP POLICY IF EXISTS "sc_find_requests_auth_read" ON sc_find_requests;
DROP POLICY IF EXISTS "sc_find_requests_admin_read" ON sc_find_requests;
CREATE POLICY "sc_find_requests_admin_read" ON sc_find_requests
  FOR SELECT TO authenticated
  USING (auth.uid() = 'a6316b86-f6dd-4fee-9449-b125eafd97e8');
