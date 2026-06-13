-- Migration: caster_user_id + dual edit access + hide pending profiles
-- Run once in Supabase SQL Editor

-- 1. Add caster_user_id column
ALTER TABLE sc_profiles ADD COLUMN IF NOT EXISTS caster_user_id UUID DEFAULT NULL;

-- 2. Backfill default owner on rows missing owner_user_id (optional)
UPDATE sc_profiles
SET owner_user_id = 'a6316b86-f6dd-4fee-9449-b125eafd97e8'
WHERE owner_user_id IS NULL;

-- 3. Hide pending profiles from public listings (is_active should be false until approved)
UPDATE sc_profiles
SET is_active = false
WHERE status IS DISTINCT FROM 'approved';

-- 4. Replace RLS policies for owner + caster edit/read access
DROP POLICY IF EXISTS "Owner can read own profile" ON sc_profiles;
DROP POLICY IF EXISTS "Owner can update own profile" ON sc_profiles;

CREATE POLICY "Owner can read own profile"
    ON sc_profiles FOR SELECT
    USING (auth.uid() = owner_user_id OR auth.uid() = caster_user_id);

CREATE POLICY "Owner can update own profile"
    ON sc_profiles FOR UPDATE
    USING (auth.uid() = owner_user_id OR auth.uid() = caster_user_id)
    WITH CHECK (auth.uid() = owner_user_id OR auth.uid() = caster_user_id);

-- Ensure public read policy only exposes approved + active profiles
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON sc_profiles;
CREATE POLICY "Public profiles are viewable by everyone"
    ON sc_profiles FOR SELECT
    USING (status = 'approved' AND is_active = true);
