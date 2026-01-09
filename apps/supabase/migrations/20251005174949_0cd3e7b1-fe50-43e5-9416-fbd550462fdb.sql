-- Drop existing views
DROP VIEW IF EXISTS public.public_campaigns;
DROP VIEW IF EXISTS public.public_profiles;

-- Recreate public_campaigns view with security_invoker
CREATE VIEW public.public_campaigns 
WITH (security_invoker = true)
AS
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
WHERE status = ANY (ARRAY['active'::text, 'ended'::text]);

-- Recreate public_profiles view with security_invoker
CREATE VIEW public.public_profiles
WITH (security_invoker = true)
AS
SELECT 
  id,
  username,
  full_name,
  avatar_url,
  bio,
  total_earnings,
  trust_score,
  demographics_score,
  views_score
FROM profiles;