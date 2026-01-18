-- Add trigger to automatically create default milestones for new brands
-- The function create_default_milestones() already exists in 20251231075542_milestone_notifications.sql

-- Create the trigger on brands table
CREATE TRIGGER create_brand_milestones
AFTER INSERT ON public.brands
FOR EACH ROW EXECUTE FUNCTION public.create_default_milestones();

-- Backfill default milestones for existing brands that don't have any
INSERT INTO public.milestone_configs (brand_id, milestone_type, threshold, message_template)
SELECT
  b.id,
  'views'::text,
  10000,
  'Congratulations! You''ve reached 10K views! Keep up the great work.'
FROM public.brands b
WHERE NOT EXISTS (
  SELECT 1 FROM public.milestone_configs mc WHERE mc.brand_id = b.id
);

INSERT INTO public.milestone_configs (brand_id, milestone_type, threshold, message_template)
SELECT
  b.id,
  'views'::text,
  50000,
  'Amazing! You''ve hit 50K views! You''re crushing it.'
FROM public.brands b
WHERE NOT EXISTS (
  SELECT 1 FROM public.milestone_configs mc
  WHERE mc.brand_id = b.id AND mc.milestone_type = 'views' AND mc.threshold = 50000
);

INSERT INTO public.milestone_configs (brand_id, milestone_type, threshold, message_template)
SELECT
  b.id,
  'views'::text,
  100000,
  'Incredible! 100K views milestone achieved! You''re a star.'
FROM public.brands b
WHERE NOT EXISTS (
  SELECT 1 FROM public.milestone_configs mc
  WHERE mc.brand_id = b.id AND mc.milestone_type = 'views' AND mc.threshold = 100000
);

INSERT INTO public.milestone_configs (brand_id, milestone_type, threshold, message_template)
SELECT
  b.id,
  'views'::text,
  500000,
  'Phenomenal! 500K views! You''re making a huge impact.'
FROM public.brands b
WHERE NOT EXISTS (
  SELECT 1 FROM public.milestone_configs mc
  WHERE mc.brand_id = b.id AND mc.milestone_type = 'views' AND mc.threshold = 500000
);

INSERT INTO public.milestone_configs (brand_id, milestone_type, threshold, message_template)
SELECT
  b.id,
  'views'::text,
  1000000,
  'LEGENDARY! 1 MILLION VIEWS! You''ve made history!'
FROM public.brands b
WHERE NOT EXISTS (
  SELECT 1 FROM public.milestone_configs mc
  WHERE mc.brand_id = b.id AND mc.milestone_type = 'views' AND mc.threshold = 1000000
);

-- Earnings milestones backfill
INSERT INTO public.milestone_configs (brand_id, milestone_type, threshold, message_template)
SELECT
  b.id,
  'earnings'::text,
  100,
  'You''ve earned your first $100! Great start.'
FROM public.brands b
WHERE NOT EXISTS (
  SELECT 1 FROM public.milestone_configs mc
  WHERE mc.brand_id = b.id AND mc.milestone_type = 'earnings' AND mc.threshold = 100
);

INSERT INTO public.milestone_configs (brand_id, milestone_type, threshold, message_template)
SELECT
  b.id,
  'earnings'::text,
  500,
  'Nice work! You''ve earned $500 with us.'
FROM public.brands b
WHERE NOT EXISTS (
  SELECT 1 FROM public.milestone_configs mc
  WHERE mc.brand_id = b.id AND mc.milestone_type = 'earnings' AND mc.threshold = 500
);

INSERT INTO public.milestone_configs (brand_id, milestone_type, threshold, message_template)
SELECT
  b.id,
  'earnings'::text,
  1000,
  'You''ve hit $1,000 in earnings! Amazing.'
FROM public.brands b
WHERE NOT EXISTS (
  SELECT 1 FROM public.milestone_configs mc
  WHERE mc.brand_id = b.id AND mc.milestone_type = 'earnings' AND mc.threshold = 1000
);

INSERT INTO public.milestone_configs (brand_id, milestone_type, threshold, message_template)
SELECT
  b.id,
  'earnings'::text,
  5000,
  'Wow! $5,000 earned. You''re a top performer!'
FROM public.brands b
WHERE NOT EXISTS (
  SELECT 1 FROM public.milestone_configs mc
  WHERE mc.brand_id = b.id AND mc.milestone_type = 'earnings' AND mc.threshold = 5000
);

INSERT INTO public.milestone_configs (brand_id, milestone_type, threshold, message_template)
SELECT
  b.id,
  'earnings'::text,
  10000,
  'Incredible! $10,000 earned! You''re elite.'
FROM public.brands b
WHERE NOT EXISTS (
  SELECT 1 FROM public.milestone_configs mc
  WHERE mc.brand_id = b.id AND mc.milestone_type = 'earnings' AND mc.threshold = 10000
);
