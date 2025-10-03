-- Create table for campaign account analytics
CREATE TABLE public.campaign_account_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL,
  account_username TEXT NOT NULL,
  account_link TEXT,
  platform TEXT NOT NULL,
  outperforming_video_rate NUMERIC DEFAULT 0,
  total_videos INTEGER DEFAULT 0,
  total_views INTEGER DEFAULT 0,
  total_likes INTEGER DEFAULT 0,
  total_comments INTEGER DEFAULT 0,
  average_engagement_rate NUMERIC DEFAULT 0,
  average_video_views NUMERIC DEFAULT 0,
  posts_last_7_days JSONB,
  last_tracked DATE,
  amount_of_videos_tracked TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.campaign_account_analytics ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can view campaign analytics"
ON public.campaign_account_analytics
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert campaign analytics"
ON public.campaign_account_analytics
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update campaign analytics"
ON public.campaign_account_analytics
FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete campaign analytics"
ON public.campaign_account_analytics
FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_campaign_account_analytics_updated_at
BEFORE UPDATE ON public.campaign_account_analytics
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_campaign_account_analytics_campaign_id 
ON public.campaign_account_analytics(campaign_id);

CREATE INDEX idx_campaign_account_analytics_platform 
ON public.campaign_account_analytics(platform);