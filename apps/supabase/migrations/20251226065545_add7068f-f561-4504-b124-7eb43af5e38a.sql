-- Add columns to cached_campaign_videos for user matching and weekly tracking
ALTER TABLE public.cached_campaign_videos 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS social_account_id uuid REFERENCES public.social_accounts(id),
ADD COLUMN IF NOT EXISTS matched_at timestamptz,
ADD COLUMN IF NOT EXISTS week_start_views bigint DEFAULT 0,
ADD COLUMN IF NOT EXISTS week_start_date date;

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_cached_campaign_videos_user_id ON public.cached_campaign_videos(user_id);
CREATE INDEX IF NOT EXISTS idx_cached_campaign_videos_social_account_id ON public.cached_campaign_videos(social_account_id);
CREATE INDEX IF NOT EXISTS idx_cached_campaign_videos_campaign_user ON public.cached_campaign_videos(campaign_id, user_id);
CREATE INDEX IF NOT EXISTS idx_cached_campaign_videos_week_start ON public.cached_campaign_videos(week_start_date);

-- Add hashtags column to campaigns if not exists (for filtering videos)
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS hashtags text[] DEFAULT '{}';