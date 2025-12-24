-- Add columns to campaign_videos to store video metadata from TikTok API
ALTER TABLE public.campaign_videos 
ADD COLUMN IF NOT EXISTS social_account_id UUID REFERENCES public.social_accounts(id),
ADD COLUMN IF NOT EXISTS video_title TEXT,
ADD COLUMN IF NOT EXISTS video_description TEXT,
ADD COLUMN IF NOT EXISTS video_cover_url TEXT,
ADD COLUMN IF NOT EXISTS video_author_username TEXT,
ADD COLUMN IF NOT EXISTS video_author_avatar TEXT,
ADD COLUMN IF NOT EXISTS video_upload_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS video_views BIGINT,
ADD COLUMN IF NOT EXISTS video_likes BIGINT,
ADD COLUMN IF NOT EXISTS video_comments BIGINT,
ADD COLUMN IF NOT EXISTS video_shares BIGINT;