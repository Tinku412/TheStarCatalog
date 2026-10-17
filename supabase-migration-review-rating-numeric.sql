-- ============================================================================
-- Store review overall scores as decimals (3.7), not whole stars (4)
-- ============================================================================
-- sc_reviews.rating is int4, so (3 + 4 + 4) / 3 was rounded to 4 on insert.
-- Run this once in the Supabase SQL Editor.
-- ============================================================================

ALTER TABLE sc_reviews DROP CONSTRAINT IF EXISTS sc_reviews_rating_check;

ALTER TABLE sc_reviews
    ALTER COLUMN rating TYPE NUMERIC(2,1)
    USING rating::NUMERIC(2,1);

ALTER TABLE sc_reviews
    ADD CONSTRAINT sc_reviews_rating_check CHECK (rating >= 1 AND rating <= 5);

-- Rebuild existing overalls from the three category scores.
UPDATE sc_reviews
SET rating = ROUND(
    (rating_communication::NUMERIC + rating_accuracy::NUMERIC + rating_value::NUMERIC) / 3.0,
    1
)
WHERE rating_communication IS NOT NULL
  AND rating_accuracy IS NOT NULL
  AND rating_value IS NOT NULL;

-- Profile header / directory rating follows the same one-decimal average.
UPDATE sc_profiles p
SET
    average_rating = stats.avg_rating,
    review_count   = stats.cnt
FROM (
    SELECT
        profile_id,
        ROUND(AVG(rating)::NUMERIC, 1) AS avg_rating,
        COUNT(*)::INTEGER              AS cnt
    FROM sc_reviews
    GROUP BY profile_id
) AS stats
WHERE p.id = stats.profile_id;
