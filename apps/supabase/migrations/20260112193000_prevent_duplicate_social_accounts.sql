-- Migration: Prevent duplicate social account linking (fraud prevention)
-- Date: 2026-01-12
--
-- This migration adds a unique constraint to prevent the same social media account
-- (platform + username) from being connected by multiple users.
--
-- Background: A fraud case was discovered where user "ivelin." (mahavir789u@gmail.com)
-- connected TikTok account @growth.lyra0 which was already linked to user "ibby4797",
-- resulting in $220 of stolen earnings. 45 other duplicate accounts were also found
-- and removed as part of this cleanup.
--
-- NOTE: This constraint was applied directly to production on 2026-01-12.
-- Duplicate accounts were removed before applying the constraint.

-- Add unique constraint to prevent duplicate social accounts
-- This ensures each platform + username combination can only exist once
ALTER TABLE social_accounts
ADD CONSTRAINT IF NOT EXISTS unique_platform_username UNIQUE (platform, username);

-- Add a comment explaining the constraint
COMMENT ON CONSTRAINT unique_platform_username ON social_accounts IS
  'Prevents fraud by ensuring each social media account can only be linked to one user';
