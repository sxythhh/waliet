
-- Create a function to get creator earnings for a specific brand
CREATE OR REPLACE FUNCTION get_brand_creator_earnings(p_brand_id uuid)
RETURNS TABLE (
  user_id uuid,
  total_earnings numeric
) 
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  WITH brand_campaigns AS (
    SELECT id FROM campaigns WHERE brand_id = p_brand_id
    UNION ALL
    SELECT id FROM bounty_campaigns WHERE brand_id = p_brand_id
  )
  SELECT 
    wt.user_id,
    SUM(wt.amount)::numeric as total_earnings
  FROM wallet_transactions wt
  WHERE wt.type = 'earning'
    AND (
      (wt.metadata->>'campaign_id')::uuid IN (SELECT id FROM brand_campaigns)
      OR (wt.metadata->>'boost_id')::uuid IN (SELECT id FROM brand_campaigns)
    )
  GROUP BY wt.user_id;
$$;
