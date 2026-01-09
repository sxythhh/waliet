-- Add Shortimize-specific fields to campaign_account_analytics
ALTER TABLE public.campaign_account_analytics
ADD COLUMN IF NOT EXISTS shortimize_account_id text,
ADD COLUMN IF NOT EXISTS median_views_non_zero numeric,
ADD COLUMN IF NOT EXISTS percent_outperform_10x numeric,
ADD COLUMN IF NOT EXISTS percent_outperform_25x numeric,
ADD COLUMN IF NOT EXISTS total_bookmarks integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_shares integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS latest_followers_count integer,
ADD COLUMN IF NOT EXISTS latest_following_count integer,
ADD COLUMN IF NOT EXISTS tracking_type text,
ADD COLUMN IF NOT EXISTS bio text,
ADD COLUMN IF NOT EXISTS last_uploaded_at date;

-- Create shortimize_tracking table for campaign-level sync status
CREATE TABLE IF NOT EXISTS public.shortimize_tracking (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  collection_id text,
  collection_name text,
  last_sync_at timestamp with time zone,
  sync_status text DEFAULT 'pending',
  accounts_synced integer DEFAULT 0,
  sync_error text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, collection_name)
);

-- Enable RLS on shortimize_tracking
ALTER TABLE public.shortimize_tracking ENABLE ROW LEVEL SECURITY;

-- RLS policies for shortimize_tracking
CREATE POLICY "Authenticated users can view shortimize tracking"
  ON public.shortimize_tracking
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert shortimize tracking"
  ON public.shortimize_tracking
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update shortimize tracking"
  ON public.shortimize_tracking
  FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete shortimize tracking"
  ON public.shortimize_tracking
  FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Create trigger for updated_at
CREATE TRIGGER update_shortimize_tracking_updated_at
  BEFORE UPDATE ON public.shortimize_tracking
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_campaign_account_analytics_shortimize_account_id 
  ON public.campaign_account_analytics(shortimize_account_id);

CREATE INDEX IF NOT EXISTS idx_shortimize_tracking_campaign_id 
  ON public.shortimize_tracking(campaign_id);