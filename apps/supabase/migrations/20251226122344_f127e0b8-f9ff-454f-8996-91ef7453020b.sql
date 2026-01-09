-- Create unified payment ledger table
CREATE TABLE public.payment_ledger (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_submission_id UUID REFERENCES public.video_submissions(id) ON DELETE SET NULL,
  boost_submission_id UUID REFERENCES public.boost_video_submissions(id) ON DELETE SET NULL,
  
  -- Source tracking
  source_type TEXT NOT NULL CHECK (source_type IN ('campaign', 'boost')),
  source_id UUID NOT NULL,
  
  -- Payment type
  payment_type TEXT NOT NULL CHECK (payment_type IN ('cpm', 'milestone', 'flat_rate', 'retainer', 'view_bonus')),
  
  -- Rate and calculation
  views_snapshot BIGINT DEFAULT 0,
  rate NUMERIC DEFAULT 0, -- CPM rate or flat amount
  milestone_threshold BIGINT, -- For milestone bonuses
  
  -- Accrual tracking
  accrued_amount NUMERIC NOT NULL DEFAULT 0,
  paid_amount NUMERIC NOT NULL DEFAULT 0,
  
  -- State tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'locked', 'clearing', 'paid', 'clawed_back')),
  last_calculated_at TIMESTAMPTZ,
  last_paid_at TIMESTAMPTZ,
  
  -- Clearing period integration
  payout_request_id UUID REFERENCES public.submission_payout_requests(id) ON DELETE SET NULL,
  locked_at TIMESTAMPTZ,
  clearing_ends_at TIMESTAMPTZ,
  cleared_at TIMESTAMPTZ,
  
  -- Clawback tracking
  clawed_back_at TIMESTAMPTZ,
  clawback_reason TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create computed column for pending amount via function (can't use GENERATED for complex cases)
CREATE OR REPLACE FUNCTION public.get_pending_amount(ledger payment_ledger)
RETURNS NUMERIC AS $$
BEGIN
  RETURN GREATEST(0, ledger.accrued_amount - ledger.paid_amount);
END;
$$ LANGUAGE plpgsql STABLE;

-- Indexes for performance
CREATE INDEX idx_payment_ledger_user_id ON public.payment_ledger(user_id);
CREATE INDEX idx_payment_ledger_source ON public.payment_ledger(source_type, source_id);
CREATE INDEX idx_payment_ledger_video ON public.payment_ledger(video_submission_id) WHERE video_submission_id IS NOT NULL;
CREATE INDEX idx_payment_ledger_boost_video ON public.payment_ledger(boost_submission_id) WHERE boost_submission_id IS NOT NULL;
CREATE INDEX idx_payment_ledger_status ON public.payment_ledger(status);
CREATE INDEX idx_payment_ledger_payout_request ON public.payment_ledger(payout_request_id) WHERE payout_request_id IS NOT NULL;
CREATE INDEX idx_payment_ledger_pending ON public.payment_ledger(user_id, status) WHERE status = 'pending';

-- Unique constraint to prevent duplicate entries per video/payment type combo
CREATE UNIQUE INDEX idx_payment_ledger_unique_video 
ON public.payment_ledger(video_submission_id, payment_type, COALESCE(milestone_threshold, 0)) 
WHERE video_submission_id IS NOT NULL;

CREATE UNIQUE INDEX idx_payment_ledger_unique_boost_video 
ON public.payment_ledger(boost_submission_id, payment_type, COALESCE(milestone_threshold, 0)) 
WHERE boost_submission_id IS NOT NULL;

-- Enable RLS
ALTER TABLE public.payment_ledger ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own payment ledger entries
CREATE POLICY "Users can view their own payments"
ON public.payment_ledger
FOR SELECT
USING (auth.uid() = user_id);

-- Brand members can view payments for their campaigns/boosts
CREATE POLICY "Brand members can view campaign payments"
ON public.payment_ledger
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.brand_members bm
    WHERE bm.user_id = auth.uid()
    AND (
      (source_type = 'campaign' AND EXISTS (
        SELECT 1 FROM public.campaigns c WHERE c.id = source_id AND c.brand_id = bm.brand_id
      ))
      OR
      (source_type = 'boost' AND EXISTS (
        SELECT 1 FROM public.bounty_campaigns bc WHERE bc.id = source_id AND bc.brand_id = bm.brand_id
      ))
    )
  )
);

-- System can insert/update (via service role in edge functions)
CREATE POLICY "Service role can manage payments"
ON public.payment_ledger
FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');

-- Updated_at trigger
CREATE TRIGGER update_payment_ledger_updated_at
BEFORE UPDATE ON public.payment_ledger
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for payment updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_ledger;