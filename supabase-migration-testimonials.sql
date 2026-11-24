-- ============================================================================
-- Testimonials pasted from Reddit, Instagram, X, LinkedIn, or Etsy
-- ============================================================================
-- Run once in the Supabase SQL Editor.
-- Anyone can read them. Only the site admin can add or remove them.
-- ============================================================================

CREATE TABLE IF NOT EXISTS sc_testimonials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL,
    platform TEXT NOT NULL CHECK (platform IN ('reddit', 'instagram', 'x', 'linkedin', 'etsy')),
    username TEXT NOT NULL,
    comment_text TEXT NOT NULL,
    source_url TEXT NOT NULL,
    image_urls TEXT DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sc_testimonials_profile_id ON sc_testimonials(profile_id);

ALTER TABLE sc_testimonials ADD COLUMN IF NOT EXISTS image_urls TEXT DEFAULT '[]';

GRANT SELECT ON sc_testimonials TO anon, authenticated;
GRANT INSERT, DELETE ON sc_testimonials TO authenticated;

ALTER TABLE sc_testimonials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sc_testimonials_public_read ON sc_testimonials;
CREATE POLICY sc_testimonials_public_read
    ON sc_testimonials FOR SELECT
    USING (true);

DROP POLICY IF EXISTS sc_testimonials_admin_insert ON sc_testimonials;
CREATE POLICY sc_testimonials_admin_insert
    ON sc_testimonials FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = 'a6316b86-f6dd-4fee-9449-b125eafd97e8');

DROP POLICY IF EXISTS sc_testimonials_admin_delete ON sc_testimonials;
CREATE POLICY sc_testimonials_admin_delete
    ON sc_testimonials FOR DELETE TO authenticated
    USING (auth.uid() = 'a6316b86-f6dd-4fee-9449-b125eafd97e8');
