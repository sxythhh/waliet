-- Add all existing brands to the sales pipeline under "lead" stage
-- Only create deals for brands that don't already have one
INSERT INTO public.sales_deals (brand_id, stage, owner_id)
SELECT 
  b.id as brand_id,
  'lead'::sales_stage as stage,
  (SELECT id FROM auth.users LIMIT 1) as owner_id
FROM public.brands b
WHERE NOT EXISTS (
  SELECT 1 
  FROM public.sales_deals sd 
  WHERE sd.brand_id = b.id
);