-- Add video metadata columns to video_submissions table
ALTER TABLE public.video_submissions 
ADD COLUMN IF NOT EXISTS video_description TEXT,
ADD COLUMN IF NOT EXISTS video_thumbnail_url TEXT,
ADD COLUMN IF NOT EXISTS video_author_username TEXT,
ADD COLUMN IF NOT EXISTS video_author_avatar TEXT;