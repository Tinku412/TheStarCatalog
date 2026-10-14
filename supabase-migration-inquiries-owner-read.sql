-- ============================================================================
-- Profile inquiries — let the profile owner read their own inquiries
-- ============================================================================
-- Run once in the Supabase SQL Editor.
-- Admin (a6316b86-…) already has SELECT via sc_inquiries_admin_read.
-- This adds the same access for the caster whose owner_user_id or
-- caster_user_id is stored on sc_profiles. Everyone else stays blocked.
-- ============================================================================

DROP POLICY IF EXISTS "sc_inquiries_owner_read" ON sc_inquiries;
CREATE POLICY "sc_inquiries_owner_read" ON sc_inquiries
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sc_profiles p
      WHERE p.id = sc_inquiries.profile_id
        AND (p.owner_user_id = auth.uid() OR p.caster_user_id = auth.uid())
    )
  );
