-- Add DELETE policy for campaigns
CREATE POLICY "Authenticated users can delete campaigns"
ON public.campaigns
FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Add DELETE policy for brands
CREATE POLICY "Authenticated users can delete brands"
ON public.brands
FOR DELETE
USING (auth.uid() IS NOT NULL);