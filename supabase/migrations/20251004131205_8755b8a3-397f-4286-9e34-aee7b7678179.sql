-- Allow admins to update payout request status for processing
CREATE POLICY "Admins can update payout request processing"
ON public.payout_requests
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));