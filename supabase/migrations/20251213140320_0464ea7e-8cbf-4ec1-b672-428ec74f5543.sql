-- Create boost_video_submissions table for tracking creator video submissions
CREATE TABLE public.boost_video_submissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bounty_campaign_id uuid NOT NULL REFERENCES public.bounty_campaigns(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  video_url text NOT NULL,
  platform text NOT NULL,
  submission_notes text,
  status text NOT NULL DEFAULT 'pending',
  payout_amount numeric,
  reviewed_at timestamp with time zone,
  reviewed_by uuid,
  rejection_reason text,
  submitted_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create index for fast lookups
CREATE INDEX idx_boost_video_submissions_bounty ON public.boost_video_submissions(bounty_campaign_id);
CREATE INDEX idx_boost_video_submissions_user ON public.boost_video_submissions(user_id);
CREATE INDEX idx_boost_video_submissions_status ON public.boost_video_submissions(status);

-- Enable RLS
ALTER TABLE public.boost_video_submissions ENABLE ROW LEVEL SECURITY;

-- Creators can view their own submissions
CREATE POLICY "Creators can view own submissions"
ON public.boost_video_submissions
FOR SELECT
USING (auth.uid() = user_id);

-- Creators can insert submissions for boosts they're accepted to
CREATE POLICY "Creators can submit videos for accepted boosts"
ON public.boost_video_submissions
FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  AND EXISTS (
    SELECT 1 FROM public.bounty_applications ba
    WHERE ba.bounty_campaign_id = boost_video_submissions.bounty_campaign_id
    AND ba.user_id = auth.uid()
    AND ba.status = 'accepted'
  )
);

-- Brand admins can view submissions for their boosts
CREATE POLICY "Brand admins can view boost submissions"
ON public.boost_video_submissions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.bounty_campaigns bc
    WHERE bc.id = boost_video_submissions.bounty_campaign_id
    AND (is_brand_member(auth.uid(), bc.brand_id) OR has_role(auth.uid(), 'admin'::app_role))
  )
);

-- Brand admins can update submissions (approve/reject)
CREATE POLICY "Brand admins can update boost submissions"
ON public.boost_video_submissions
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.bounty_campaigns bc
    WHERE bc.id = boost_video_submissions.bounty_campaign_id
    AND (is_brand_admin(auth.uid(), bc.brand_id) OR has_role(auth.uid(), 'admin'::app_role))
  )
);

-- Admins can manage all submissions
CREATE POLICY "Admins can manage all boost submissions"
ON public.boost_video_submissions
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Trigger to update updated_at
CREATE TRIGGER update_boost_video_submissions_updated_at
BEFORE UPDATE ON public.boost_video_submissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();