-- Add hashtag column to campaigns table for filtering Shortimize videos
ALTER TABLE public.campaigns 
ADD COLUMN hashtag text;