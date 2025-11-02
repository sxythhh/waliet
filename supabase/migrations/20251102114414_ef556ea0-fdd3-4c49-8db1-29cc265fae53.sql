-- Add content preferences columns to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS content_languages text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS content_styles text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS content_niches text[] DEFAULT '{}';