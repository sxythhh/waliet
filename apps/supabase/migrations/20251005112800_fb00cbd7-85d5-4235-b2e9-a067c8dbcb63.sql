-- Update RLS policy to allow users to see campaigns they've joined regardless of status
DROP POLICY IF EXISTS "Authenticated users can view non-financial campaign data" ON public.campaigns;

CREATE POLICY "Authenticated users can view campaigns they joined"
ON public.campaigns
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT campaign_id 
    FROM public.campaign_submissions 
    WHERE creator_id = auth.uid() AND status != 'withdrawn'
  )
  OR status = 'active'
);