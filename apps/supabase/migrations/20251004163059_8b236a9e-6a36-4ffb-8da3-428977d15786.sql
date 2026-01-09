-- Allow admins to insert social accounts for any user
CREATE POLICY "Admins can insert social accounts for users"
ON public.social_accounts
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
);