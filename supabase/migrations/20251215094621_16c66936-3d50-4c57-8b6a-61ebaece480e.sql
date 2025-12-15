-- Create cached_campaign_videos table for storing synced Shortimize videos
CREATE TABLE public.cached_campaign_videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  shortimize_video_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  username TEXT NOT NULL,
  video_url TEXT,
  thumbnail_url TEXT,
  title TEXT,
  caption TEXT,
  description TEXT,
  views BIGINT DEFAULT 0,
  likes BIGINT DEFAULT 0,
  comments BIGINT DEFAULT 0,
  shares BIGINT DEFAULT 0,
  bookmarks BIGINT DEFAULT 0,
  uploaded_at TIMESTAMP WITH TIME ZONE,
  cached_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, shortimize_video_id)
);

-- Create indexes for fast queries
CREATE INDEX idx_cached_campaign_videos_campaign_id ON public.cached_campaign_videos(campaign_id);
CREATE INDEX idx_cached_campaign_videos_brand_id ON public.cached_campaign_videos(brand_id);
CREATE INDEX idx_cached_campaign_videos_username ON public.cached_campaign_videos(username);
CREATE INDEX idx_cached_campaign_videos_uploaded_at ON public.cached_campaign_videos(uploaded_at DESC);

-- Create text search index for hashtag/title filtering
CREATE INDEX idx_cached_campaign_videos_text_search ON public.cached_campaign_videos 
  USING gin(to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(caption, '') || ' ' || COALESCE(description, '')));

-- Enable RLS
ALTER TABLE public.cached_campaign_videos ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Brand members can view their cached videos"
  ON public.cached_campaign_videos
  FOR SELECT
  USING (is_brand_member(auth.uid(), brand_id) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can manage cached videos"
  ON public.cached_campaign_videos
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create campaign_video_sync_status table to track sync state
CREATE TABLE public.campaign_video_sync_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL UNIQUE REFERENCES public.campaigns(id) ON DELETE CASCADE,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  sync_status TEXT DEFAULT 'pending',
  error_message TEXT,
  videos_synced INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on sync status
ALTER TABLE public.campaign_video_sync_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brand members can view sync status"
  ON public.campaign_video_sync_status
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.campaigns c
    WHERE c.id = campaign_id AND (is_brand_member(auth.uid(), c.brand_id) OR has_role(auth.uid(), 'admin'::app_role))
  ));

CREATE POLICY "Service role can manage sync status"
  ON public.campaign_video_sync_status
  FOR ALL
  USING (true)
  WITH CHECK (true);