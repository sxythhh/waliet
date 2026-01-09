-- Allow admins to create campaign submissions for any user
CREATE POLICY "Admins can insert submissions for users"
ON public.campaign_submissions
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
);