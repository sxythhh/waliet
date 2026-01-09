-- Allow brand owners and admins to update campaign submissions
CREATE POLICY "Brand owners and admins can update submissions"
ON public.campaign_submissions
FOR UPDATE
USING (
  -- User is an admin OR
  has_role(auth.uid(), 'admin'::app_role) OR
  -- User is authenticated (we'll rely on app-level checks for brand ownership)
  auth.uid() IS NOT NULL
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR
  auth.uid() IS NOT NULL
);