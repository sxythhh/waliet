-- Add missing columns to pitches table for the Pitch feature
ALTER TABLE public.pitches ADD COLUMN IF NOT EXISTS type text DEFAULT 'creator_to_brand';
ALTER TABLE public.pitches ADD COLUMN IF NOT EXISTS campaign_id uuid REFERENCES public.campaigns(id);
ALTER TABLE public.pitches ADD COLUMN IF NOT EXISTS boost_id uuid REFERENCES public.bounty_campaigns(id);
ALTER TABLE public.pitches ADD COLUMN IF NOT EXISTS portfolio_links text[];
ALTER TABLE public.pitches ADD COLUMN IF NOT EXISTS proposed_rate numeric;

-- Add settings JSONB column to brands table
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS settings jsonb DEFAULT '{}';

-- Add missing columns to creator_contracts table
ALTER TABLE public.creator_contracts ADD COLUMN IF NOT EXISTS contract_url text;
ALTER TABLE public.creator_contracts ADD COLUMN IF NOT EXISTS sent_at timestamptz;
ALTER TABLE public.creator_contracts ADD COLUMN IF NOT EXISTS signed_at timestamptz;

-- Add missing columns to video_submissions table
ALTER TABLE public.video_submissions ADD COLUMN IF NOT EXISTS thumbnail_url text;
ALTER TABLE public.video_submissions ADD COLUMN IF NOT EXISTS title text;

-- Create payout_approvals table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.payout_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_request_id uuid NOT NULL,
  payout_type text NOT NULL DEFAULT 'crypto',
  user_id uuid REFERENCES auth.users(id),
  requested_by uuid REFERENCES auth.users(id),
  amount numeric NOT NULL,
  currency text DEFAULT 'USD',
  status text DEFAULT 'pending',
  required_approvals int DEFAULT 2,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create payout_approval_votes table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.payout_approval_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_id uuid REFERENCES public.payout_approvals(id) ON DELETE CASCADE,
  admin_id uuid REFERENCES auth.users(id),
  vote text NOT NULL CHECK (vote IN ('approve', 'reject')),
  comment text,
  created_at timestamptz DEFAULT now()
);

-- Create payout_audit_log table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.payout_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_id uuid REFERENCES public.payout_approvals(id),
  actor_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.payout_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_approval_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for payout_approvals (admin only)
CREATE POLICY "Admins can view all payout approvals"
  ON public.payout_approvals FOR SELECT
  USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));

CREATE POLICY "Admins can insert payout approvals"
  ON public.payout_approvals FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));

CREATE POLICY "Admins can update payout approvals"
  ON public.payout_approvals FOR UPDATE
  USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));

-- RLS policies for payout_approval_votes
CREATE POLICY "Admins can view all votes"
  ON public.payout_approval_votes FOR SELECT
  USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));

CREATE POLICY "Admins can cast votes"
  ON public.payout_approval_votes FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()) AND admin_id = auth.uid());

-- RLS policies for payout_audit_log
CREATE POLICY "Admins can view audit log"
  ON public.payout_audit_log FOR SELECT
  USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));

CREATE POLICY "System can insert audit logs"
  ON public.payout_audit_log FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));