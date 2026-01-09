-- Add policy for admins to view all social accounts
CREATE POLICY "Admins can view all social accounts"
ON public.social_accounts
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));