-- Create table for tracking campaign video metrics over time
CREATE TABLE public.campaign_video_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  total_views BIGINT NOT NULL DEFAULT 0,
  total_likes BIGINT NOT NULL DEFAULT 0,
  total_comments BIGINT NOT NULL DEFAULT 0,
  total_shares BIGINT NOT NULL DEFAULT 0,
  total_bookmarks BIGINT NOT NULL DEFAULT 0,
  total_videos INTEGER NOT NULL DEFAULT 0,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.campaign_video_metrics ENABLE ROW LEVEL SECURITY;

-- Create index for efficient querying
CREATE INDEX idx_campaign_video_metrics_campaign_id ON public.campaign_video_metrics(campaign_id);
CREATE INDEX idx_campaign_video_metrics_recorded_at ON public.campaign_video_metrics(recorded_at DESC);

-- RLS policy for brand members to view their campaign metrics
CREATE POLICY "Brand members can view their campaign metrics"
ON public.campaign_video_metrics
FOR SELECT
USING (
  public.is_brand_member(auth.uid(), brand_id)
);

-- RLS policy for admins
CREATE POLICY "Admins can view all campaign metrics"
ON public.campaign_video_metrics
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
);