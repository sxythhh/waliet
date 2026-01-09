-- Add RLS policy to allow authenticated users to insert campaigns
CREATE POLICY "Authenticated users can create campaigns"
ON public.campaigns
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);