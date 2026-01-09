
-- Add missing columns to brands table
ALTER TABLE public.brands 
ADD COLUMN IF NOT EXISTS website text,
ADD COLUMN IF NOT EXISTS onboarding_step integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;

-- Add missing columns to brand_invitations table
ALTER TABLE public.brand_invitations 
ADD COLUMN IF NOT EXISTS invite_token text UNIQUE,
ADD COLUMN IF NOT EXISTS is_link_invite boolean DEFAULT false;

-- Add missing columns to bounty_campaigns table
ALTER TABLE public.bounty_campaigns 
ADD COLUMN IF NOT EXISTS reward_amount numeric DEFAULT 0;

-- Add missing columns to brand_referrals table  
ALTER TABLE public.brand_referrals 
ADD COLUMN IF NOT EXISTS referrer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS reward_earned numeric DEFAULT 0;

-- Create index on invite_token for fast lookups
CREATE INDEX IF NOT EXISTS idx_brand_invitations_invite_token ON public.brand_invitations(invite_token) WHERE invite_token IS NOT NULL;
