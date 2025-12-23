-- Add slug column to bounty_campaigns
ALTER TABLE public.bounty_campaigns ADD COLUMN slug text;

-- Create unique index for slug
CREATE UNIQUE INDEX bounty_campaigns_slug_unique ON public.bounty_campaigns(slug) WHERE slug IS NOT NULL;

-- Generate slugs for existing bounty campaigns based on title
UPDATE public.bounty_campaigns 
SET slug = LOWER(
  REGEXP_REPLACE(
    REGEXP_REPLACE(title, '[^a-zA-Z0-9\s-]', '', 'g'),
    '\s+', '-', 'g'
  )
) || '-' || SUBSTRING(id::text, 1, 8)
WHERE slug IS NULL;