-- Create junction table for social accounts and campaigns (many-to-many relationship)
CREATE TABLE IF NOT EXISTS public.social_account_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  social_account_id UUID NOT NULL REFERENCES public.social_accounts(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  connected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(social_account_id, campaign_id)
);

-- Enable RLS on the junction table
ALTER TABLE public.social_account_campaigns ENABLE ROW LEVEL SECURITY;

-- Users can view their own social account campaign connections
CREATE POLICY "Users can view own social account campaigns"
  ON public.social_account_campaigns
  FOR SELECT
  USING (
    social_account_id IN (
      SELECT id FROM public.social_accounts WHERE user_id = auth.uid()
    )
  );

-- Users can connect their own social accounts to campaigns
CREATE POLICY "Users can connect own social accounts to campaigns"
  ON public.social_account_campaigns
  FOR INSERT
  WITH CHECK (
    social_account_id IN (
      SELECT id FROM public.social_accounts WHERE user_id = auth.uid()
    )
  );

-- Users can disconnect their own social accounts from campaigns
CREATE POLICY "Users can disconnect own social accounts from campaigns"
  ON public.social_account_campaigns
  FOR DELETE
  USING (
    social_account_id IN (
      SELECT id FROM public.social_accounts WHERE user_id = auth.uid()
    )
  );

-- Admins can view all connections
CREATE POLICY "Admins can view all social account campaigns"
  ON public.social_account_campaigns
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can manage all connections
CREATE POLICY "Admins can manage all social account campaigns"
  ON public.social_account_campaigns
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Migrate existing social_accounts data to the junction table
INSERT INTO public.social_account_campaigns (social_account_id, campaign_id, connected_at)
SELECT id, campaign_id, connected_at
FROM public.social_accounts
WHERE campaign_id IS NOT NULL
ON CONFLICT (social_account_id, campaign_id) DO NOTHING;

-- Create index for better performance
CREATE INDEX idx_social_account_campaigns_account ON public.social_account_campaigns(social_account_id);
CREATE INDEX idx_social_account_campaigns_campaign ON public.social_account_campaigns(campaign_id);

-- Add comment
COMMENT ON TABLE public.social_account_campaigns IS 'Junction table linking social accounts to campaigns, allowing one account to be used across multiple campaigns';