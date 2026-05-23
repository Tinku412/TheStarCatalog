-- Run this in Supabase SQL Editor if slug is not being saved on new profiles.

ALTER TABLE sc_profiles ADD COLUMN IF NOT EXISTS slug TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_sc_profiles_slug_unique ON sc_profiles (slug) WHERE slug IS NOT NULL;

-- Optional: backfill slugs for existing rows (run once)
-- UPDATE sc_profiles
-- SET slug = lower(regexp_replace(regexp_replace(trim(professional_name), '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g'))
-- WHERE slug IS NULL AND professional_name IS NOT NULL AND trim(professional_name) <> '';
