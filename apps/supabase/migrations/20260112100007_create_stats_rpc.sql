-- RPC function to get creator campaign statistics
-- Used by refresh-creator-scores Edge Function

CREATE OR REPLACE FUNCTION get_creator_campaign_stats(p_creator_ids UUID[] DEFAULT NULL)
RETURNS TABLE (
  creator_id UUID,
  campaigns_completed INTEGER,
  boosts_completed INTEGER,
  videos_delivered INTEGER,
  avg_views NUMERIC,
  unique_brands INTEGER
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id AS creator_id,
    -- Count approved campaign submissions
    COALESCE((
      SELECT COUNT(DISTINCT cs.campaign_id)::INTEGER
      FROM campaign_submissions cs
      WHERE cs.creator_id = p.id AND cs.status = 'approved'
    ), 0) AS campaigns_completed,
    -- Count accepted boost applications
    COALESCE((
      SELECT COUNT(DISTINCT ba.bounty_campaign_id)::INTEGER
      FROM bounty_applications ba
      WHERE ba.user_id = p.id AND ba.status = 'accepted'
    ), 0) AS boosts_completed,
    -- Count total approved videos
    COALESCE((
      SELECT COUNT(*)::INTEGER
      FROM campaign_submissions cs
      WHERE cs.creator_id = p.id AND cs.status = 'approved'
    ) + (
      SELECT COUNT(*)::INTEGER
      FROM video_submissions vs
      WHERE vs.user_id = p.id AND vs.status = 'approved'
    ), 0) AS videos_delivered,
    -- Average views per video
    (
      SELECT AVG(cs.views)
      FROM campaign_submissions cs
      WHERE cs.creator_id = p.id AND cs.status = 'approved' AND cs.views > 0
    ) AS avg_views,
    -- Unique brands worked with
    (
      SELECT COUNT(DISTINCT c.brand_id)::INTEGER
      FROM campaign_submissions cs
      JOIN campaigns c ON c.id = cs.campaign_id
      WHERE cs.creator_id = p.id AND cs.status = 'approved'
    ) AS unique_brands
  FROM profiles p
  WHERE
    p.onboarding_completed = true
    AND p.account_type = 'creator'
    AND (p_creator_ids IS NULL OR p.id = ANY(p_creator_ids));
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_creator_campaign_stats TO service_role;
GRANT EXECUTE ON FUNCTION get_creator_campaign_stats TO authenticated;

COMMENT ON FUNCTION get_creator_campaign_stats IS 'Returns campaign statistics for creators, used by score refresh function';
