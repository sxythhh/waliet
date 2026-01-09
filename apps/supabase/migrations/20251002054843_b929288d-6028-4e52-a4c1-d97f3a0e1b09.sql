-- Add slug column to campaigns table
ALTER TABLE campaigns ADD COLUMN slug text;

-- Create unique index on slug
CREATE UNIQUE INDEX campaigns_slug_idx ON campaigns(slug);

-- Generate slugs for existing campaigns based on their title and id
UPDATE campaigns 
SET slug = lower(regexp_replace(
  regexp_replace(title, '[^a-zA-Z0-9\s-]', '', 'g'),
  '\s+', '-', 'g'
)) || '-' || substr(id::text, 1, 8)
WHERE slug IS NULL;

-- Make slug not nullable after populating existing records
ALTER TABLE campaigns ALTER COLUMN slug SET NOT NULL;