-- Add infinite budget flag to campaigns table
ALTER TABLE campaigns
ADD COLUMN is_infinite_budget boolean DEFAULT false;

-- Update the public_campaigns view to include the new column
DROP VIEW IF EXISTS public_campaigns;

CREATE VIEW public_campaigns AS
SELECT 
  id,
  title,
  description,
  brand_name,
  brand_logo_url,
  banner_url,
  guidelines,
  preview_url,
  slug,
  status,
  allowed_platforms,
  brand_id,
  created_at,
  updated_at,
  start_date,
  end_date,
  application_questions,
  is_private,
  is_infinite_budget
FROM campaigns
WHERE status IN ('active', 'ended');