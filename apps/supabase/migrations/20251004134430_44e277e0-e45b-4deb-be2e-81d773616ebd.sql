-- Add RLS policy for admins to view all campaign submissions
CREATE POLICY "Admins can view all submissions"
ON public.campaign_submissions
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));