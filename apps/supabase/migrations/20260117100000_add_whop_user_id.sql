-- Add whop_user_id to profiles table for dual auth support
-- This allows users to authenticate via Whop iframe OR Supabase (standalone)

-- Add whop_user_id column (nullable for users who only use Supabase auth)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS whop_user_id TEXT UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_whop_user_id ON public.profiles(whop_user_id)
WHERE whop_user_id IS NOT NULL;

-- Add whop_email for storing Whop-provided email (may differ from Supabase email)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS whop_email TEXT;

-- Add whop_linked_at timestamp
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS whop_linked_at TIMESTAMPTZ;

-- Comment on columns for documentation
COMMENT ON COLUMN public.profiles.whop_user_id IS 'Whop user ID for users authenticated via Whop iframe';
COMMENT ON COLUMN public.profiles.whop_email IS 'Email from Whop (may differ from Supabase auth email)';
COMMENT ON COLUMN public.profiles.whop_linked_at IS 'When this profile was linked to a Whop account';
