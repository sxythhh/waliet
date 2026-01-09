-- Add missing columns to creator_testimonials
ALTER TABLE public.creator_testimonials
ADD COLUMN IF NOT EXISTS creator_name TEXT,
ADD COLUMN IF NOT EXISTS creator_avatar_url TEXT;

-- Add analytics recording columns to video_submissions
ALTER TABLE public.video_submissions
ADD COLUMN IF NOT EXISTS analytics_recording_url TEXT,
ADD COLUMN IF NOT EXISTS analytics_recording_requested_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS analytics_recording_uploaded_at TIMESTAMPTZ;