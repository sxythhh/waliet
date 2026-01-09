-- Create demographic_submissions table
CREATE TABLE public.demographic_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  social_account_id UUID NOT NULL REFERENCES public.social_accounts(id) ON DELETE CASCADE,
  tier1_percentage NUMERIC NOT NULL CHECK (tier1_percentage >= 0 AND tier1_percentage <= 100),
  screenshot_url TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  score INTEGER CHECK (score >= 0 AND score <= 100),
  admin_notes TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.demographic_submissions ENABLE ROW LEVEL SECURITY;

-- Users can view their own submissions
CREATE POLICY "Users can view own demographic submissions"
ON public.demographic_submissions
FOR SELECT
USING (
  social_account_id IN (
    SELECT id FROM public.social_accounts WHERE user_id = auth.uid()
  )
);

-- Users can insert their own submissions
CREATE POLICY "Users can create demographic submissions"
ON public.demographic_submissions
FOR INSERT
WITH CHECK (
  social_account_id IN (
    SELECT id FROM public.social_accounts WHERE user_id = auth.uid()
  )
);

-- Admins can view all submissions
CREATE POLICY "Admins can view all demographic submissions"
ON public.demographic_submissions
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update submissions (for scoring)
CREATE POLICY "Admins can update demographic submissions"
ON public.demographic_submissions
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster queries
CREATE INDEX idx_demographic_submissions_social_account ON public.demographic_submissions(social_account_id);
CREATE INDEX idx_demographic_submissions_status ON public.demographic_submissions(status);

-- Trigger for updated_at
CREATE TRIGGER update_demographic_submissions_updated_at
BEFORE UPDATE ON public.demographic_submissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();