-- Add payment model fields to campaigns
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS payment_model text DEFAULT 'pay_per_view',
ADD COLUMN IF NOT EXISTS post_rate numeric DEFAULT 0;

-- Add status field to campaign_videos for approval workflow
ALTER TABLE public.campaign_videos 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';

-- Create index for faster status filtering
CREATE INDEX IF NOT EXISTS idx_campaign_videos_status ON public.campaign_videos(status);
CREATE INDEX IF NOT EXISTS idx_campaign_videos_campaign_status ON public.campaign_videos(campaign_id, status);

-- Add comment for documentation
COMMENT ON COLUMN public.campaigns.payment_model IS 'Payment model: pay_per_view (CPM based on views) or pay_per_post (fixed rate per approved video)';
COMMENT ON COLUMN public.campaigns.post_rate IS 'Fixed payment amount per approved video when payment_model is pay_per_post';
COMMENT ON COLUMN public.campaign_videos.status IS 'Video submission status: pending, approved, rejected';