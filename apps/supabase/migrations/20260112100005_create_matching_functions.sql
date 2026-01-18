-- Matching functions for creator recommendations
-- Implements the core matching algorithm for the creator database

-- Function to get recommended creators for a brand
CREATE OR REPLACE FUNCTION get_recommended_creators(
  p_brand_id UUID,
  p_skill_types UUID[] DEFAULT NULL,
  p_max_rate NUMERIC DEFAULT NULL,
  p_min_quality_score NUMERIC DEFAULT NULL,
  p_availability TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
) RETURNS TABLE (
  creator_id UUID,
  username TEXT,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  primary_skill_type_id UUID,
  primary_skill_name TEXT,
  primary_skill_category TEXT,
  rate_per_video NUMERIC,
  turnaround_days INTEGER,
  match_score NUMERIC,
  total_campaigns_completed INTEGER,
  avg_quality_score NUMERIC,
  avg_timeliness_score NUMERIC,
  repeat_hire_rate NUMERIC,
  retainer_recommendation_rate NUMERIC,
  availability_status TEXT,
  worked_with_brand BOOLEAN
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id AS creator_id,
    p.username,
    p.full_name,
    p.avatar_url,
    p.bio,
    cp.primary_skill_type_id,
    cst.name AS primary_skill_name,
    cst.category AS primary_skill_category,
    crc.rate_per_video,
    crc.turnaround_days,
    COALESCE(ccs.overall_score, p.trust_score, 50)::NUMERIC AS match_score,
    COALESCE(ccs.total_campaigns_completed, 0)::INTEGER AS total_campaigns_completed,
    ccs.avg_quality_score,
    ccs.avg_timeliness_score,
    ccs.repeat_hire_rate,
    ccs.retainer_recommendation_rate,
    COALESCE(ccs.availability_status, 'available') AS availability_status,
    EXISTS (
      SELECT 1 FROM brand_creator_feedback bcf
      WHERE bcf.brand_id = p_brand_id AND bcf.creator_id = p.id
    ) AS worked_with_brand
  FROM profiles p
  LEFT JOIN creator_portfolios cp ON cp.user_id = p.id
  LEFT JOIN creator_skill_types cst ON cst.id = cp.primary_skill_type_id
  LEFT JOIN creator_computed_scores ccs ON ccs.creator_id = p.id
  LEFT JOIN creator_rate_cards crc ON crc.creator_id = p.id
    AND crc.skill_type_id = cp.primary_skill_type_id
    AND crc.is_public = true
  WHERE
    p.onboarding_completed = true
    AND p.account_type = 'creator'
    -- Skill type filter
    AND (p_skill_types IS NULL OR cp.primary_skill_type_id = ANY(p_skill_types))
    -- Max rate filter
    AND (p_max_rate IS NULL OR crc.rate_per_video IS NULL OR crc.rate_per_video <= p_max_rate)
    -- Min quality filter
    AND (p_min_quality_score IS NULL OR ccs.avg_quality_score IS NULL OR ccs.avg_quality_score >= p_min_quality_score)
    -- Availability filter
    AND (p_availability IS NULL OR ccs.availability_status = p_availability OR ccs.availability_status IS NULL)
  ORDER BY
    -- Boost creators who worked with this brand before
    CASE WHEN EXISTS (
      SELECT 1 FROM brand_creator_feedback bcf
      WHERE bcf.brand_id = p_brand_id AND bcf.creator_id = p.id AND bcf.would_hire_again = true
    ) THEN 0 ELSE 1 END,
    -- Then by match score
    COALESCE(ccs.overall_score, p.trust_score, 50) DESC NULLS LAST,
    -- Then by quality
    ccs.avg_quality_score DESC NULLS LAST,
    -- Then by completion count
    ccs.total_campaigns_completed DESC NULLS LAST
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Function to score an applicant for a specific campaign
CREATE OR REPLACE FUNCTION score_campaign_applicant(
  p_creator_id UUID,
  p_campaign_id UUID
) RETURNS TABLE (
  total_score NUMERIC,
  performance_score NUMERIC,
  brand_affinity_score NUMERIC,
  price_value_score NUMERIC,
  availability_score NUMERIC,
  skill_match_score NUMERIC
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_brand_id UUID;
  v_campaign_budget NUMERIC;
  v_perf_score NUMERIC := 0;
  v_affinity_score NUMERIC := 0;
  v_value_score NUMERIC := 0;
  v_avail_score NUMERIC := 0;
  v_skill_score NUMERIC := 0;
BEGIN
  -- Get campaign details
  SELECT c.brand_id, c.budget INTO v_brand_id, v_campaign_budget
  FROM campaigns c WHERE c.id = p_campaign_id;

  -- Performance score (30%) - based on past campaign performance
  SELECT COALESCE(
    (ccs.avg_quality_score / 5.0) * 0.4 +
    LEAST(ccs.total_campaigns_completed / 10.0, 1) * 0.3 +
    COALESCE(ccs.avg_completion_rate, 0.5) * 0.3,
    0.5
  ) * 30 INTO v_perf_score
  FROM creator_computed_scores ccs
  WHERE ccs.creator_id = p_creator_id;

  -- Brand affinity score (20%) - past work with this brand
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM brand_creator_feedback bcf
      WHERE bcf.brand_id = v_brand_id
      AND bcf.creator_id = p_creator_id
      AND bcf.would_hire_again = true
    ) THEN 20
    WHEN EXISTS (
      SELECT 1 FROM brand_creator_feedback bcf
      WHERE bcf.brand_id = v_brand_id
      AND bcf.creator_id = p_creator_id
    ) THEN 10
    ELSE 0
  END INTO v_affinity_score;

  -- Price-to-value score (25%) - quality relative to rate
  SELECT COALESCE(ccs.value_score / 100 * 25, 12.5) INTO v_value_score
  FROM creator_computed_scores ccs
  WHERE ccs.creator_id = p_creator_id;

  -- Availability score (15%)
  SELECT CASE ccs.availability_status
    WHEN 'available' THEN 15
    WHEN 'limited' THEN 8
    ELSE 0
  END INTO v_avail_score
  FROM creator_computed_scores ccs
  WHERE ccs.creator_id = p_creator_id;

  -- Default if no computed scores
  IF v_avail_score IS NULL THEN v_avail_score := 10; END IF;
  IF v_perf_score IS NULL THEN v_perf_score := 15; END IF;
  IF v_value_score IS NULL THEN v_value_score := 12.5; END IF;

  -- Skill match score (10%) - could be enhanced with campaign requirements
  v_skill_score := 10; -- Default full score for now

  RETURN QUERY SELECT
    (v_perf_score + v_affinity_score + v_value_score + v_avail_score + v_skill_score)::NUMERIC,
    v_perf_score,
    v_affinity_score,
    v_value_score,
    v_avail_score,
    v_skill_score;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_recommended_creators TO authenticated;
GRANT EXECUTE ON FUNCTION score_campaign_applicant TO authenticated;

COMMENT ON FUNCTION get_recommended_creators IS 'Returns recommended creators for a brand with filtering and sorting by match score';
COMMENT ON FUNCTION score_campaign_applicant IS 'Scores a creator application for a specific campaign based on multiple factors';
