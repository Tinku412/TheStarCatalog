-- ============================================================================
-- Hide private columns from anonymous browser requests
-- ============================================================================
-- Run once in the Supabase SQL Editor.
-- Public pages only read the columns they display. This stops a visitor from
-- requesting caster emails, owner ids, or reviewer emails directly.
-- Signed-in owners can still read the columns they need to edit a profile.
-- ============================================================================

REVOKE SELECT (email, owner_user_id, caster_user_id, created_by)
    ON sc_profiles FROM anon;

REVOKE SELECT (reviewer_email)
    ON sc_reviews FROM anon;
