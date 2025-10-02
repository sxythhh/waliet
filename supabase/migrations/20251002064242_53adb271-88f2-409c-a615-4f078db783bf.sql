-- Add campaign_id to social_accounts to track which campaign each account is linked to
ALTER TABLE public.social_accounts 
ADD COLUMN campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL;