-- Add 'withdrawn' status to campaign_submissions
ALTER TABLE public.campaign_submissions 
DROP CONSTRAINT IF EXISTS campaign_submissions_status_check;

ALTER TABLE public.campaign_submissions 
ADD CONSTRAINT campaign_submissions_status_check 
CHECK (status IN ('pending', 'approved', 'rejected', 'withdrawn'));

-- Add RLS policy for users to update their own pending submissions to withdrawn
CREATE POLICY "Users can withdraw own pending applications"
ON public.campaign_submissions
FOR UPDATE
USING (auth.uid() = creator_id AND status = 'pending')
WITH CHECK (auth.uid() = creator_id AND status = 'withdrawn');