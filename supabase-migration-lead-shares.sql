-- ============================================================================
-- Lead sharing — track which casters a lead was sent to, and when
-- ============================================================================
-- Run once in the Supabase SQL Editor.
-- Used by leads-analytics.html to assign / share leads with spellcasters.
-- ============================================================================

CREATE TABLE IF NOT EXISTS sc_lead_shares (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_source TEXT NOT NULL CHECK (lead_source IN ('inquiry', 'find')),
    lead_id UUID NOT NULL,
    profile_id UUID NOT NULL REFERENCES sc_profiles(id) ON DELETE CASCADE,
    shared_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    UNIQUE (lead_source, lead_id, profile_id)
);

ALTER TABLE sc_lead_shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sc_lead_shares_admin_select" ON sc_lead_shares;
CREATE POLICY "sc_lead_shares_admin_select" ON sc_lead_shares
  FOR SELECT TO authenticated
  USING (auth.uid() = 'a6316b86-f6dd-4fee-9449-b125eafd97e8');

DROP POLICY IF EXISTS "sc_lead_shares_admin_insert" ON sc_lead_shares;
CREATE POLICY "sc_lead_shares_admin_insert" ON sc_lead_shares
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = 'a6316b86-f6dd-4fee-9449-b125eafd97e8');

DROP POLICY IF EXISTS "sc_lead_shares_admin_delete" ON sc_lead_shares;
CREATE POLICY "sc_lead_shares_admin_delete" ON sc_lead_shares
  FOR DELETE TO authenticated
  USING (auth.uid() = 'a6316b86-f6dd-4fee-9449-b125eafd97e8');

CREATE INDEX IF NOT EXISTS idx_sc_lead_shares_lead
    ON sc_lead_shares(lead_source, lead_id);
CREATE INDEX IF NOT EXISTS idx_sc_lead_shares_profile
    ON sc_lead_shares(profile_id);
CREATE INDEX IF NOT EXISTS idx_sc_lead_shares_shared_at
    ON sc_lead_shares(shared_at DESC);
