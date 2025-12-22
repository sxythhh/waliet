-- Add policy to allow anyone to view blueprints that are linked to active/public bounty campaigns
CREATE POLICY "Anyone can view blueprints linked to public boosts"
ON public.blueprints
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.bounty_campaigns bc
    WHERE bc.blueprint_id = blueprints.id
    AND bc.status IN ('active', 'ended')
    AND bc.is_private = false
  )
);

-- Also allow viewing blueprints linked to public campaigns
CREATE POLICY "Anyone can view blueprints linked to public campaigns"
ON public.blueprints
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.campaigns c
    WHERE c.blueprint_id = blueprints.id
    AND c.status IN ('active', 'ended')
    AND c.is_private = false
  )
);