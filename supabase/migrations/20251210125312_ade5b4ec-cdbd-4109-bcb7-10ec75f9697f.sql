-- Drop existing restrictive INSERT policy
DROP POLICY IF EXISTS "Authenticated users can insert campaign analytics" ON public.campaign_account_analytics;

-- Create permissive INSERT policy
CREATE POLICY "Authenticated users can insert campaign analytics"
ON public.campaign_account_analytics
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- Also fix the other policies to be permissive
DROP POLICY IF EXISTS "Authenticated users can update campaign analytics" ON public.campaign_account_analytics;
DROP POLICY IF EXISTS "Authenticated users can delete campaign analytics" ON public.campaign_account_analytics;
DROP POLICY IF EXISTS "Authenticated users can view campaign analytics" ON public.campaign_account_analytics;

CREATE POLICY "Authenticated users can view campaign analytics"
ON public.campaign_account_analytics
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update campaign analytics"
ON public.campaign_account_analytics
FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete campaign analytics"
ON public.campaign_account_analytics
FOR DELETE
TO authenticated
USING (auth.uid() IS NOT NULL);