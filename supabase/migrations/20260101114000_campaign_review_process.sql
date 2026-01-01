-- Add review status fields to bounty_campaigns table
ALTER TABLE public.bounty_campaigns
ADD COLUMN IF NOT EXISTS review_status TEXT DEFAULT 'draft' CHECK (review_status IN ('draft', 'pending_review', 'approved', 'rejected', 'changes_requested')),
ADD COLUMN IF NOT EXISTS review_notes TEXT,
ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

-- Add review status fields to campaigns table (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'campaigns') THEN
    ALTER TABLE public.campaigns
    ADD COLUMN IF NOT EXISTS review_status TEXT DEFAULT 'draft' CHECK (review_status IN ('draft', 'pending_review', 'approved', 'rejected', 'changes_requested')),
    ADD COLUMN IF NOT EXISTS review_notes TEXT,
    ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
  END IF;
END $$;

-- Add comments
COMMENT ON COLUMN public.bounty_campaigns.review_status IS 'Review status: draft, pending_review, approved, rejected, changes_requested';
COMMENT ON COLUMN public.bounty_campaigns.review_notes IS 'Notes from the reviewer';
COMMENT ON COLUMN public.bounty_campaigns.reviewed_by IS 'Admin who reviewed the campaign';
COMMENT ON COLUMN public.bounty_campaigns.reviewed_at IS 'When the campaign was reviewed';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_bounty_campaigns_review_status ON public.bounty_campaigns(review_status);
