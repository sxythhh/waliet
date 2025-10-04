-- Add banner_url column to courses table
ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS banner_url TEXT;