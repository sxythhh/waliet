-- Migration: Allow multiple social accounts per platform per user
-- Date: 2026-01-16
--
-- This migration removes the UNIQUE(user_id, platform) constraint to allow users
-- to connect multiple TikTok/Instagram/YouTube accounts.
--
-- The unique_platform_username constraint remains in place to prevent fraud
-- (same social account cannot be linked by multiple users).

-- Drop the original unique constraint that limits one account per platform per user
ALTER TABLE social_accounts
DROP CONSTRAINT IF EXISTS social_accounts_user_id_platform_key;

-- Also try the older constraint name format in case it exists
ALTER TABLE social_accounts
DROP CONSTRAINT IF EXISTS social_accounts_user_id_platform_idx;

-- Add a comment explaining the change
COMMENT ON TABLE social_accounts IS
  'Stores connected social media accounts. Users can connect multiple accounts per platform. Each unique platform+username can only be linked to one user (fraud prevention).';
