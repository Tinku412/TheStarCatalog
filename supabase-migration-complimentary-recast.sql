-- ============================================================================
-- Provides Complimentary Recast on spellcaster profiles
-- ============================================================================
-- Run this once in the Supabase SQL Editor.
-- Existing profiles stay blank until the field is set on add/edit.
-- ============================================================================

ALTER TABLE sc_profiles
    ADD COLUMN IF NOT EXISTS provides_complimentary_recast TEXT DEFAULT NULL;
