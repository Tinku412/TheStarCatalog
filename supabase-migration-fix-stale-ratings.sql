-- ============================================================================
-- Reset stale average_rating / review_count on sc_profiles
-- ============================================================================
-- Problem: Some profiles show star ratings on the site even though they have
-- no rows in sc_reviews. Their average_rating / review_count columns were left
-- out of sync (manual edits, deleted reviews, or missing trigger).
--
-- Run this once in the Supabase SQL Editor.
-- ============================================================================

-- 1) Zero out stats for profiles that have ZERO reviews
UPDATE sc_profiles p
SET
    average_rating = NULL,
    review_count   = 0
WHERE NOT EXISTS (
    SELECT 1 FROM sc_reviews r WHERE r.profile_id = p.id
)
AND (
    p.average_rating IS NOT NULL
    OR COALESCE(p.review_count, 0) <> 0
);

-- 2) Recompute stats for profiles that DO have reviews
UPDATE sc_profiles p
SET
    average_rating = stats.avg_rating,
    review_count   = stats.cnt
FROM (
    SELECT
        profile_id,
        ROUND(AVG(rating)::NUMERIC, 2) AS avg_rating,
        COUNT(*)::INTEGER              AS cnt
    FROM sc_reviews
    GROUP BY profile_id
) AS stats
WHERE p.id = stats.profile_id;

-- Optional: install the auto-sync trigger so this stays correct going forward.
-- Uncomment and run if not already installed:

-- CREATE OR REPLACE FUNCTION sc_update_profile_rating_stats()
-- RETURNS TRIGGER LANGUAGE plpgsql AS $$
-- DECLARE v_id UUID; BEGIN
--     v_id := COALESCE(NEW.profile_id, OLD.profile_id);
--     UPDATE sc_profiles
--        SET average_rating = (
--                SELECT ROUND(AVG(rating)::NUMERIC, 2) FROM sc_reviews WHERE profile_id = v_id
--            ),
--            review_count = (
--                SELECT COUNT(*)::INTEGER FROM sc_reviews WHERE profile_id = v_id
--            )
--     WHERE id = v_id;
--     RETURN NEW;
-- END; $$;
--
-- DROP TRIGGER IF EXISTS sc_reviews_rating_stats ON sc_reviews;
-- CREATE TRIGGER sc_reviews_rating_stats
-- AFTER INSERT OR UPDATE OR DELETE ON sc_reviews
-- FOR EACH ROW EXECUTE FUNCTION sc_update_profile_rating_stats();
