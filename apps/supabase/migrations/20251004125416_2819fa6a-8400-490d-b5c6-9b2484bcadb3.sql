-- Allow admins to create wallets for any user
CREATE POLICY "Admins can create wallets for users"
ON public.wallets
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));