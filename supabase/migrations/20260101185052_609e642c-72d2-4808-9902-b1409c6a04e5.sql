-- =============================================
-- PHASE 2: QUERY OPTIMIZATION - Creator Insights RPC (Fixed)
-- =============================================

-- Create optimized creator insights function to replace N+1 queries
CREATE OR REPLACE FUNCTION public.get_creator_insights(
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  username TEXT,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ,
  total_earnings NUMERIC,
  total_submissions BIGINT,
  approved_submissions BIGINT,
  approval_rate NUMERIC,
  last_active TIMESTAMPTZ,
  platform_breakdown JSONB
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH creator_earnings AS (
    SELECT 
      user_id,
      COALESCE(SUM(ABS(amount)), 0) as total_earnings,
      MAX(created_at) as last_earning_at
    FROM wallet_transactions
    WHERE type = 'earning'
    GROUP BY user_id
  ),
  creator_submissions AS (
    SELECT 
      creator_id,
      COUNT(*) as total_submissions,
      COUNT(*) FILTER (WHERE status = 'approved') as approved_submissions,
      MAX(submitted_at) as last_submission_at
    FROM campaign_submissions
    GROUP BY creator_id
  ),
  submission_platforms AS (
    SELECT 
      creator_id,
      jsonb_agg(jsonb_build_object('platform', platform, 'count', platform_count)) as platform_breakdown
    FROM (
      SELECT 
        creator_id,
        platform,
        COUNT(*) as platform_count
      FROM campaign_submissions
      GROUP BY creator_id, platform
    ) grouped
    GROUP BY creator_id
  )
  SELECT 
    p.id,
    p.username,
    p.email,
    p.avatar_url,
    p.created_at,
    COALESCE(ce.total_earnings, 0) as total_earnings,
    COALESCE(cs.total_submissions, 0) as total_submissions,
    COALESCE(cs.approved_submissions, 0) as approved_submissions,
    CASE 
      WHEN COALESCE(cs.total_submissions, 0) > 0 
      THEN ROUND((COALESCE(cs.approved_submissions, 0)::NUMERIC / cs.total_submissions) * 100, 2)
      ELSE 0 
    END as approval_rate,
    GREATEST(ce.last_earning_at, cs.last_submission_at) as last_active,
    COALESCE(sp.platform_breakdown, '[]'::jsonb) as platform_breakdown
  FROM profiles p
  LEFT JOIN creator_earnings ce ON ce.user_id = p.id
  LEFT JOIN creator_submissions cs ON cs.creator_id = p.id
  LEFT JOIN submission_platforms sp ON sp.creator_id = p.id
  ORDER BY p.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;

-- Create stats summary function
CREATE OR REPLACE FUNCTION public.get_creator_insights_stats()
RETURNS TABLE (
  total_creators BIGINT,
  active_creators BIGINT,
  at_risk_creators BIGINT,
  dormant_creators BIGINT,
  churned_creators BIGINT,
  avg_earnings NUMERIC
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH creator_activity AS (
    SELECT 
      p.id,
      GREATEST(
        (SELECT MAX(wt.created_at) FROM wallet_transactions wt WHERE wt.user_id = p.id AND wt.type = 'earning'),
        (SELECT MAX(cs.submitted_at) FROM campaign_submissions cs WHERE cs.creator_id = p.id)
      ) as last_active
    FROM profiles p
  ),
  categorized AS (
    SELECT 
      ca.id,
      CASE 
        WHEN ca.last_active IS NULL THEN 'churned'
        WHEN ca.last_active > NOW() - INTERVAL '14 days' THEN 'active'
        WHEN ca.last_active > NOW() - INTERVAL '30 days' THEN 'at_risk'
        WHEN ca.last_active > NOW() - INTERVAL '90 days' THEN 'dormant'
        ELSE 'churned'
      END as status
    FROM creator_activity ca
  ),
  earnings_avg AS (
    SELECT COALESCE(AVG(total), 0) as avg_earnings
    FROM (
      SELECT user_id, SUM(ABS(amount)) as total
      FROM wallet_transactions
      WHERE type = 'earning'
      GROUP BY user_id
    ) user_totals
  )
  SELECT 
    (SELECT COUNT(*) FROM profiles)::BIGINT as total_creators,
    (SELECT COUNT(*) FROM categorized WHERE status = 'active')::BIGINT as active_creators,
    (SELECT COUNT(*) FROM categorized WHERE status = 'at_risk')::BIGINT as at_risk_creators,
    (SELECT COUNT(*) FROM categorized WHERE status = 'dormant')::BIGINT as dormant_creators,
    (SELECT COUNT(*) FROM categorized WHERE status = 'churned')::BIGINT as churned_creators,
    (SELECT avg_earnings FROM earnings_avg) as avg_earnings;
$$;