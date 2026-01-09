-- Add current_level to public_profiles view for leaderboard
DROP VIEW IF EXISTS public_profiles;

CREATE VIEW public_profiles AS
SELECT 
  p.id,
  p.username,
  p.full_name,
  p.avatar_url,
  p.bio,
  p.current_level,
  COALESCE(
    (SELECT SUM(amount) FROM wallet_transactions wt WHERE wt.user_id = p.id AND wt.type = 'earning' AND wt.amount > 0),
    0
  )::DECIMAL(10,2) as total_earnings,
  p.trust_score,
  p.demographics_score,
  p.views_score
FROM profiles p
WHERE p.is_private = false OR p.is_private IS NULL;

-- Grant access to the view
GRANT SELECT ON public_profiles TO anon, authenticated;