-- Migration: Enhanced onboarding and announcements popup system

-- Add onboarding tracking to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username_set_at TIMESTAMPTZ;

-- Enhance announcements table with rich content support
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS cta_text TEXT;
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS cta_link TEXT;
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS show_as_popup BOOLEAN DEFAULT true;
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS target_audience TEXT DEFAULT 'all' CHECK (target_audience IN ('all', 'creators', 'brands'));
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Create user_announcement_views to track which users have seen/dismissed announcements
CREATE TABLE IF NOT EXISTS public.user_announcement_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT now(),
  dismissed_at TIMESTAMPTZ,
  UNIQUE(user_id, announcement_id)
);

-- Enable RLS on user_announcement_views
ALTER TABLE public.user_announcement_views ENABLE ROW LEVEL SECURITY;

-- Users can view their own announcement views
CREATE POLICY "Users can view own announcement views"
ON public.user_announcement_views
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own announcement views
CREATE POLICY "Users can insert own announcement views"
ON public.user_announcement_views
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own announcement views (to dismiss)
CREATE POLICY "Users can update own announcement views"
ON public.user_announcement_views
FOR UPDATE
USING (auth.uid() = user_id);

-- Create function to check username availability
CREATE OR REPLACE FUNCTION public.check_username_available(desired_username TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Username must be at least 3 characters
  IF length(desired_username) < 3 THEN
    RETURN FALSE;
  END IF;

  -- Check if username is already taken (case-insensitive)
  RETURN NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE LOWER(username) = LOWER(desired_username)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.check_username_available(TEXT) TO authenticated;

-- Create index for faster username lookups
CREATE INDEX IF NOT EXISTS idx_profiles_username_lower ON public.profiles (LOWER(username));

-- Create index for announcement queries
CREATE INDEX IF NOT EXISTS idx_announcements_active_popup ON public.announcements (is_active, show_as_popup) WHERE is_active = true AND show_as_popup = true;
CREATE INDEX IF NOT EXISTS idx_user_announcement_views_user ON public.user_announcement_views (user_id);
