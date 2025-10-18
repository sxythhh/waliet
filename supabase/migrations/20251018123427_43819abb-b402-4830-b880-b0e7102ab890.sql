-- Add DELETE policy for admins on social_accounts table
CREATE POLICY "Admins can delete social accounts"
ON public.social_accounts
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));