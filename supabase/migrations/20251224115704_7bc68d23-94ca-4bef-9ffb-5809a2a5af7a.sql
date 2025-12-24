-- Drop the failed tables if they exist
DROP TABLE IF EXISTS public.submission_payout_items;
DROP TABLE IF EXISTS public.submission_payout_requests;

-- Create submission_payout_requests table for the 7-day clearing period system
CREATE TABLE public.submission_payout_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'clearing' CHECK (status IN ('clearing', 'completed', 'cancelled')),
  clearing_ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create junction table to track which submissions are included in each payout request
CREATE TABLE public.submission_payout_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payout_request_id UUID NOT NULL REFERENCES public.submission_payout_requests(id) ON DELETE CASCADE,
  submission_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('campaign', 'boost')),
  source_id UUID NOT NULL,
  is_locked BOOLEAN NOT NULL DEFAULT true,
  flagged_at TIMESTAMP WITH TIME ZONE,
  flagged_by UUID,
  flag_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient lookups
CREATE INDEX idx_submission_payout_items_submission ON public.submission_payout_items(submission_id);
CREATE INDEX idx_submission_payout_requests_user ON public.submission_payout_requests(user_id);
CREATE INDEX idx_submission_payout_requests_status ON public.submission_payout_requests(status);

-- Enable RLS
ALTER TABLE public.submission_payout_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submission_payout_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for submission_payout_requests
CREATE POLICY "Users can view their own payout requests"
ON public.submission_payout_requests FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own payout requests"
ON public.submission_payout_requests FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- RLS policies for submission_payout_items
CREATE POLICY "Users can view their own payout items"
ON public.submission_payout_items FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.submission_payout_requests 
  WHERE id = payout_request_id AND user_id = auth.uid()
));

CREATE POLICY "Users can create payout items for their requests"
ON public.submission_payout_items FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.submission_payout_requests 
  WHERE id = payout_request_id AND user_id = auth.uid()
));

-- Allow brand members to flag items (for videos in their campaigns/boosts)
CREATE POLICY "Brand members can update payout items to flag them"
ON public.submission_payout_items FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.brand_members bm
    JOIN public.campaigns c ON c.brand_id = bm.brand_id
    WHERE c.id = source_id AND source_type = 'campaign' AND bm.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.brand_members bm
    JOIN public.bounty_campaigns bc ON bc.brand_id = bm.brand_id
    WHERE bc.id = source_id AND source_type = 'boost' AND bm.user_id = auth.uid()
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_submission_payout_requests_updated_at
BEFORE UPDATE ON public.submission_payout_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add payout_status column to video_submissions to track if a submission is locked for payout
ALTER TABLE public.video_submissions ADD COLUMN IF NOT EXISTS payout_status TEXT DEFAULT 'available' CHECK (payout_status IN ('available', 'locked', 'paid'));