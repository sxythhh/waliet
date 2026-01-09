-- Add RLS policy to allow anyone to submit bounty applications
CREATE POLICY "Anyone can submit bounty applications"
ON public.bounty_applications
FOR INSERT
TO anon, authenticated
WITH CHECK (true);