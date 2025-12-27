-- Add banner_url column to profiles table for profile banners
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS banner_url TEXT;

-- Add a comment for documentation
COMMENT ON COLUMN public.profiles.banner_url IS 'URL to the user profile banner image';