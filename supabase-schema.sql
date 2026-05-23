-- SUPABASE DATABASE SCHEMA FOR THE STAR CATALOG
-- All table names are prefixed with 'SC_' as requested

-- ============================================
-- TABLE: SC_profiles
-- Stores all spell caster profile information
-- ============================================

CREATE TABLE IF NOT EXISTS SC_profiles (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Basic Information
    personal_name VARCHAR(255) NOT NULL,
    professional_name VARCHAR(255) NOT NULL,
    profile_picture_url TEXT,
    one_liner TEXT NOT NULL,
    description TEXT NOT NULL,
    specialties TEXT NOT NULL, -- Comma-separated values
    
    -- Service Details
    professional_identity VARCHAR(100) NOT NULL,
    experience VARCHAR(50) NOT NULL,
    provides_proof BOOLEAN NOT NULL DEFAULT false,
    refund_policy BOOLEAN NOT NULL DEFAULT false,
    delivery_time VARCHAR(50) NOT NULL,
    minimum_price VARCHAR(50) NOT NULL,
    
    -- Contact Information
    email VARCHAR(255) NOT NULL UNIQUE,
    website TEXT,
    store_link TEXT,
    
    -- Profile Statistics
    upvotes INTEGER DEFAULT 0,
    views INTEGER DEFAULT 0,
    average_rating NUMERIC(3,2) DEFAULT NULL,
    review_count INTEGER DEFAULT 0,
    
    -- Status & Verification
    is_verified BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected
    slug TEXT UNIQUE, -- URL-friendly identifier, e.g. 'la-bruja-next-door'
    accepts_emergency TEXT DEFAULT NULL, -- 'Yes' or 'No'
    owner_user_id UUID DEFAULT NULL,     -- Supabase auth user ID of the practitioner (set manually)

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID, -- Reference to admin user if needed
    
    -- Indexes for common queries
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_sc_profiles_email ON SC_profiles(email);
CREATE INDEX IF NOT EXISTS idx_sc_profiles_professional_identity ON SC_profiles(professional_identity);
CREATE INDEX IF NOT EXISTS idx_sc_profiles_status ON SC_profiles(status);
CREATE INDEX IF NOT EXISTS idx_sc_profiles_created_at ON SC_profiles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sc_profiles_upvotes ON SC_profiles(upvotes DESC);
CREATE INDEX IF NOT EXISTS idx_sc_profiles_slug ON SC_profiles(slug);

    -- If sc_profiles already exists, add the slug column with:
-- ALTER TABLE sc_profiles ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;
-- CREATE INDEX IF NOT EXISTS idx_sc_profiles_slug ON sc_profiles(slug);

-- ── New columns for existing databases ──────────────────────────────────────
-- Run these if your sc_profiles table already exists:
-- ALTER TABLE sc_profiles ADD COLUMN IF NOT EXISTS accepts_emergency TEXT DEFAULT NULL;
-- ALTER TABLE sc_profiles ADD COLUMN IF NOT EXISTS average_rating NUMERIC(3,2) DEFAULT NULL;
-- ALTER TABLE sc_profiles ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;
-- ALTER TABLE sc_profiles ADD COLUMN IF NOT EXISTS owner_user_id UUID DEFAULT NULL;
--   (Then set the owner: UPDATE sc_profiles SET owner_user_id = '<supabase-auth-uid>' WHERE id = '<profile-id>';)

-- ── Trigger to auto-update average_rating & review_count on sc_profiles ─────
-- Run this once to keep aggregate stats in sync automatically:
--
-- CREATE OR REPLACE FUNCTION sc_update_profile_rating_stats()
-- RETURNS TRIGGER LANGUAGE plpgsql AS $$
-- DECLARE v_id UUID; BEGIN
--     v_id := COALESCE(NEW.profile_id, OLD.profile_id);
--     UPDATE sc_profiles
--        SET average_rating = (
--                SELECT ROUND(AVG(rating)::NUMERIC, 2) FROM sc_reviews WHERE profile_id = v_id
--            ),
--            review_count = (
--                SELECT COUNT(*) FROM sc_reviews WHERE profile_id = v_id
--            )
--     WHERE id = v_id;
--     RETURN NEW;
-- END; $$;
--
-- CREATE OR REPLACE TRIGGER sc_reviews_rating_stats
-- AFTER INSERT OR UPDATE OR DELETE ON sc_reviews
-- FOR EACH ROW EXECUTE FUNCTION sc_update_profile_rating_stats();
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable Row Level Security (RLS)
ALTER TABLE SC_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies (adjust based on your auth requirements)
-- Allow anyone to read approved profiles
CREATE POLICY "Public profiles are viewable by everyone" 
    ON SC_profiles FOR SELECT 
    USING (status = 'approved' AND is_active = true);

-- Allow a profile owner to read their own profile (even when pending)
CREATE POLICY "Owner can read own profile"
    ON SC_profiles FOR SELECT
    USING (auth.uid() = owner_user_id);

-- Allow authenticated users to insert (for community submissions)
CREATE POLICY "Authenticated users can insert profiles" 
    ON SC_profiles FOR INSERT 
    WITH CHECK (true);

-- Allow the profile owner (owner_user_id) to update their own profile only
CREATE POLICY "Owner can update own profile"
    ON SC_profiles FOR UPDATE
    USING (auth.uid() = owner_user_id)
    WITH CHECK (auth.uid() = owner_user_id);

-- ── For existing databases — run these to replace the old broad UPDATE policy:
-- DROP POLICY IF EXISTS "Users can update profiles" ON sc_profiles;
-- CREATE POLICY "Owner can update own profile"
--     ON sc_profiles FOR UPDATE
--     USING (auth.uid() = owner_user_id)
--     WITH CHECK (auth.uid() = owner_user_id);
-- CREATE POLICY "Owner can read own profile"
--     ON sc_profiles FOR SELECT
--     USING (auth.uid() = owner_user_id);

-- ============================================
-- FUNCTION: Update updated_at timestamp
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for auto-updating updated_at
CREATE TRIGGER update_sc_profiles_updated_at 
    BEFORE UPDATE ON SC_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- STORAGE BUCKET: Profile Pictures
-- This is configured in Supabase Dashboard > Storage
-- Bucket name: profile-pictures
-- Public: Yes (so images can be displayed)
-- ============================================

-- Run this after creating the storage bucket in Supabase Dashboard:
-- Storage policies for profile pictures bucket
-- These need to be created in the Supabase Dashboard under Storage > Policies

-- ============================================
-- OPTIONAL: SC_profile_views (for analytics)
-- ============================================
CREATE TABLE IF NOT EXISTS SC_profile_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES SC_profiles(id) ON DELETE CASCADE,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    viewer_ip VARCHAR(50),
    viewer_user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_sc_profile_views_profile_id ON SC_profile_views(profile_id);
CREATE INDEX IF NOT EXISTS idx_sc_profile_views_viewed_at ON SC_profile_views(viewed_at DESC);

-- ============================================
-- OPTIONAL: SC_upvotes (to track who upvoted)
-- ============================================
CREATE TABLE IF NOT EXISTS SC_upvotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES SC_profiles(id) ON DELETE CASCADE,
    upvoted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    upvoter_ip VARCHAR(50),
    
    -- Prevent duplicate upvotes from same IP
    UNIQUE(profile_id, upvoter_ip)
);

CREATE INDEX IF NOT EXISTS idx_sc_upvotes_profile_id ON SC_upvotes(profile_id);

-- ============================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================
INSERT INTO SC_profiles (
    personal_name,
    professional_name,
    profile_picture_url,
    one_liner,
    description,
    specialties,
    professional_identity,
    experience,
    provides_proof,
    refund_policy,
    delivery_time,
    minimum_price,
    email,
    website,
    store_link,
    upvotes,
    is_verified,
    status
) VALUES (
    'Rose Thompson',
    'Mystic Rose',
    'https://example.com/profile.jpg',
    'Ancient love magic & relationship healing specialist',
    'Mystic Rose is a highly experienced spell caster specializing in matters of the heart. With over 15 years of practice in ancient love magic and relationship healing, she has helped countless individuals find their soulmates.',
    'love, wealth, protection, relationship healing, soulmate attraction',
    'SPELL CASTER',
    '15-20 years',
    true,
    true,
    '7-14 days',
    '$250 - $500',
    'mystic.rose@example.com',
    'https://mysticrose.com',
    'https://shop.mysticrose.com',
    127,
    true,
    'approved'
);

-- ============================================
-- REVIEWS TABLE (sc_reviews)
-- Stores all practitioner reviews with detailed sub-ratings
-- ============================================
-- Use this block to recreate sc_reviews with updated columns
DROP TABLE IF EXISTS sc_reviews CASCADE;

CREATE TABLE sc_reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID NOT NULL,
    reviewer_id UUID,
    reviewer_name TEXT NOT NULL,
    reviewer_email TEXT,
    reviewer_avatar TEXT,

    -- Overall rating (1–5, required)
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),

    -- Optional sub-ratings (1–5 each)
    rating_response_time INTEGER CHECK (rating_response_time >= 1 AND rating_response_time <= 5),
    rating_communication INTEGER CHECK (rating_communication >= 1 AND rating_communication <= 5),
    rating_accuracy      INTEGER CHECK (rating_accuracy >= 1 AND rating_accuracy <= 5),
    rating_value         INTEGER CHECK (rating_value >= 1 AND rating_value <= 5),

    review_text        TEXT NOT NULL,
    services_purchased TEXT DEFAULT NULL,  -- comma-separated list of services purchased
    hire_again         TEXT DEFAULT NULL,  -- 'Yes', 'No', or 'Maybe'
    result_time        TEXT DEFAULT NULL,  -- e.g. '1–2 weeks', '1–3 months', 'Still waiting', etc.
    image_urls         TEXT DEFAULT '[]',
    created_at         TIMESTAMPTZ DEFAULT NOW()
);

-- If sc_reviews already exists and you want to add the new columns without dropping:
-- ALTER TABLE sc_reviews ADD COLUMN IF NOT EXISTS services_purchased TEXT DEFAULT NULL;
-- ALTER TABLE sc_reviews ADD COLUMN IF NOT EXISTS hire_again TEXT DEFAULT NULL;
-- ALTER TABLE sc_reviews ADD COLUMN IF NOT EXISTS result_time TEXT DEFAULT NULL;

ALTER TABLE sc_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sc_reviews_public_read"  ON sc_reviews FOR SELECT USING (true);
CREATE POLICY "sc_reviews_auth_insert"  ON sc_reviews FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_sc_reviews_profile_id ON sc_reviews(profile_id);
CREATE INDEX IF NOT EXISTS idx_sc_reviews_created_at ON sc_reviews(created_at DESC);

-- ============================================
-- ANALYTICS TABLE (sc_analytics)
-- Tracks per-profile interaction events (hidden from UI)
-- event_type values: 'profile_card_click' | 'contact_click' | 'inquiry_submit' | 'share_click'
-- ============================================
CREATE TABLE IF NOT EXISTS sc_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID NOT NULL,
    event_type TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE sc_analytics ENABLE ROW LEVEL SECURITY;
-- Allow anonymous inserts so all visitor events are captured
CREATE POLICY "sc_analytics_anon_insert" ON sc_analytics FOR INSERT WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_sc_analytics_profile_id ON sc_analytics(profile_id);
CREATE INDEX IF NOT EXISTS idx_sc_analytics_event_type ON sc_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_sc_analytics_created_at ON sc_analytics(created_at DESC);

-- ============================================
-- LANDING EMAIL SIGNUPS (sc_landing_email_signups)
-- Collects emails for landing-page updates
-- ============================================
CREATE TABLE IF NOT EXISTS sc_landing_email_signups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    source TEXT DEFAULT 'landing_page',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT sc_landing_email_valid CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

ALTER TABLE sc_landing_email_signups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sc_landing_email_anon_insert"
    ON sc_landing_email_signups FOR INSERT
    WITH CHECK (true);

CREATE POLICY "sc_landing_email_auth_read"
    ON sc_landing_email_signups FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_sc_landing_email_created_at ON sc_landing_email_signups(created_at DESC);

-- ============================================
-- NOTES FOR SETUP:
-- ============================================
-- 1. Run this SQL in Supabase SQL Editor
-- 2. Create Storage Bucket named 'profile-pictures' with public access
-- 3. Create Storage Bucket named 'review-images' (public) for review proof images
-- 4. Enable Google OAuth via Dashboard → Authentication → Providers → Google
-- 5. Update your Supabase credentials in the frontend JavaScript
-- 6. Adjust RLS policies based on your authentication setup
-- ============================================

