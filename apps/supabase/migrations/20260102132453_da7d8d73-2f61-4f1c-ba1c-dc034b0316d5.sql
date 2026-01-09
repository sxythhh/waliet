-- Add missing columns to pitches table
ALTER TABLE public.pitches ADD COLUMN IF NOT EXISTS response_message text;
ALTER TABLE public.pitches ADD COLUMN IF NOT EXISTS expires_at timestamptz DEFAULT (now() + interval '7 days');

-- Add missing columns to payout_approvals table
ALTER TABLE public.payout_approvals ADD COLUMN IF NOT EXISTS wallet_address text;
ALTER TABLE public.payout_approvals ADD COLUMN IF NOT EXISTS requested_at timestamptz DEFAULT now();
ALTER TABLE public.payout_approvals ADD COLUMN IF NOT EXISTS executed_at timestamptz;
ALTER TABLE public.payout_approvals ADD COLUMN IF NOT EXISTS executed_by uuid REFERENCES auth.users(id);
ALTER TABLE public.payout_approvals ADD COLUMN IF NOT EXISTS tx_signature text;
ALTER TABLE public.payout_approvals ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Add missing columns to payout_approval_votes table  
ALTER TABLE public.payout_approval_votes ADD COLUMN IF NOT EXISTS voted_at timestamptz DEFAULT now();

-- Add missing columns to payout_audit_log table
ALTER TABLE public.payout_audit_log ADD COLUMN IF NOT EXISTS payout_id uuid;
ALTER TABLE public.payout_audit_log ADD COLUMN IF NOT EXISTS ip_address text;

-- Create creator_portfolios table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.creator_portfolios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  work_experience jsonb DEFAULT '[]',
  education jsonb DEFAULT '[]',
  skills text[] DEFAULT '{}',
  certifications jsonb DEFAULT '[]',
  featured_videos jsonb DEFAULT '[]',
  showcase_items jsonb DEFAULT '[]',
  content_niches text[] DEFAULT '{}',
  platforms jsonb DEFAULT '[]',
  equipment text[] DEFAULT '{}',
  languages text[] DEFAULT '{}',
  availability text,
  rate_range jsonb,
  custom_sections jsonb DEFAULT '[]',
  section_order text[] DEFAULT '{}',
  is_public boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS on creator_portfolios
ALTER TABLE public.creator_portfolios ENABLE ROW LEVEL SECURITY;

-- RLS policies for creator_portfolios
CREATE POLICY "Users can view their own portfolio"
  ON public.creator_portfolios FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own portfolio"
  ON public.creator_portfolios FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own portfolio"
  ON public.creator_portfolios FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Public portfolios are viewable by everyone"
  ON public.creator_portfolios FOR SELECT
  USING (is_public = true);