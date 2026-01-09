-- Create table to track CPM payouts for campaign videos (similar to view_bonus_payouts for boosts)
CREATE TABLE IF NOT EXISTS public.campaign_cpm_payouts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    video_submission_id UUID NOT NULL REFERENCES public.video_submissions(id) ON DELETE CASCADE,
    creator_id UUID NOT NULL,
    views_at_payout INTEGER NOT NULL DEFAULT 0,
    cpm_amount_paid NUMERIC(12, 2) NOT NULL DEFAULT 0,
    flat_rate_paid NUMERIC(12, 2) NOT NULL DEFAULT 0,
    transaction_id UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(video_submission_id)
);

-- Enable RLS
ALTER TABLE public.campaign_cpm_payouts ENABLE ROW LEVEL SECURITY;

-- Allow brand members to view payouts for their campaigns
CREATE POLICY "Brand members can view campaign cpm payouts"
ON public.campaign_cpm_payouts
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM campaigns c
        JOIN brand_members bm ON bm.brand_id = c.brand_id
        WHERE c.id = campaign_cpm_payouts.campaign_id
        AND bm.user_id = auth.uid()
    )
);

-- Allow service role to insert/update (edge function uses service role)
CREATE POLICY "Service role can manage campaign cpm payouts"
ON public.campaign_cpm_payouts
FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role')
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_campaign_cpm_payouts_campaign_id ON public.campaign_cpm_payouts(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_cpm_payouts_video_submission_id ON public.campaign_cpm_payouts(video_submission_id);

-- Add trigger for updated_at
CREATE TRIGGER update_campaign_cpm_payouts_updated_at
BEFORE UPDATE ON public.campaign_cpm_payouts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();