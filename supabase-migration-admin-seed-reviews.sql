-- ============================================================================
-- Admin-seeded reviews (no fake auth.users)
-- ============================================================================
-- Run in Supabase SQL Editor.
--
-- 1) Marks rows seeded by admin (reviewer_id NULL + custom display name)
-- 2) Tightens public insert so users can only insert as themselves
-- 3) Allows a specific admin UID to seed reviews without a reviewer auth user
-- 4) Keeps profile average_rating / review_count in sync via trigger
-- ============================================================================

-- Marker column for admin-seeded rows
ALTER TABLE sc_reviews
  ADD COLUMN IF NOT EXISTS is_admin_seeded BOOLEAN NOT NULL DEFAULT false;

-- Replace loose insert policy
DROP POLICY IF EXISTS "sc_reviews_auth_insert" ON sc_reviews;
DROP POLICY IF EXISTS "sc_reviews_user_insert" ON sc_reviews;
DROP POLICY IF EXISTS "sc_reviews_admin_seed_insert" ON sc_reviews;

-- Public / normal users: must be signed in AND own the row
CREATE POLICY "sc_reviews_user_insert" ON sc_reviews
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND reviewer_id = auth.uid()
    AND COALESCE(is_admin_seeded, false) = false
  );

-- Admin: seed with NULL reviewer_id + custom reviewer_name
-- Same UID used as default owner_user_id in admin.js / submit flow
CREATE POLICY "sc_reviews_admin_seed_insert" ON sc_reviews
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() IN (
      'a6316b86-f6dd-4fee-9449-b125eafd97e8'
    )
    AND reviewer_id IS NULL
    AND is_admin_seeded = true
  );

-- Auto-sync profile rating stats after any review change
CREATE OR REPLACE FUNCTION sc_update_profile_rating_stats()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_id UUID;
BEGIN
    v_id := COALESCE(NEW.profile_id, OLD.profile_id);
    UPDATE sc_profiles
       SET average_rating = (
               SELECT ROUND(AVG(rating)::NUMERIC, 2) FROM sc_reviews WHERE profile_id = v_id
           ),
           review_count = (
               SELECT COUNT(*)::INTEGER FROM sc_reviews WHERE profile_id = v_id
           )
     WHERE id = v_id;
    RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS sc_reviews_rating_stats ON sc_reviews;
CREATE TRIGGER sc_reviews_rating_stats
AFTER INSERT OR UPDATE OR DELETE ON sc_reviews
FOR EACH ROW EXECUTE FUNCTION sc_update_profile_rating_stats();
