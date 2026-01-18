-- Seed creator_computed_scores from existing data
-- This bootstraps the matching algorithm with historical performance data

-- Insert computed scores for all existing creators with completed onboarding
INSERT INTO creator_computed_scores (
  creator_id,
  total_campaigns_completed,
  total_boosts_completed,
  total_videos_delivered,
  avg_views_per_video,
  avg_completion_rate,
  unique_brands_worked_with,
  availability_status,
  last_active_at,
  overall_score,
  last_computed_at
)
SELECT
  p.id,
  -- Count approved campaign submissions
  COALESCE((
    SELECT COUNT(DISTINCT cs.campaign_id)
    FROM campaign_submissions cs
    WHERE cs.creator_id = p.id AND cs.status = 'approved'
  ), 0)::INTEGER,
  -- Count accepted boost applications
  COALESCE((
    SELECT COUNT(DISTINCT ba.bounty_campaign_id)
    FROM bounty_applications ba
    WHERE ba.user_id = p.id AND ba.status = 'accepted'
  ), 0)::INTEGER,
  -- Count total approved videos
  COALESCE((
    SELECT COUNT(*)
    FROM campaign_submissions cs
    WHERE cs.creator_id = p.id AND cs.status = 'approved'
  ) + (
    SELECT COUNT(*)
    FROM video_submissions vs
    WHERE vs.user_id = p.id AND vs.status = 'approved'
  ), 0)::INTEGER,
  -- Average views per video
  (
    SELECT AVG(cs.views)
    FROM campaign_submissions cs
    WHERE cs.creator_id = p.id AND cs.status = 'approved' AND cs.views > 0
  ),
  -- Completion rate (approved / total submitted)
  CASE
    WHEN (SELECT COUNT(*) FROM campaign_submissions WHERE creator_id = p.id) > 0
    THEN (
      SELECT COUNT(*)::NUMERIC / NULLIF(COUNT(*) FILTER (WHERE status IN ('approved', 'declined')), 0)
      FROM campaign_submissions
      WHERE creator_id = p.id AND status = 'approved'
    )
    ELSE NULL
  END,
  -- Unique brands worked with
  (
    SELECT COUNT(DISTINCT c.brand_id)
    FROM campaign_submissions cs
    JOIN campaigns c ON c.id = cs.campaign_id
    WHERE cs.creator_id = p.id AND cs.status = 'approved'
  )::INTEGER,
  -- Availability (default to available)
  'available',
  -- Last active
  GREATEST(
    p.updated_at,
    (SELECT MAX(cs.submitted_at) FROM campaign_submissions cs WHERE cs.creator_id = p.id)
  ),
  -- Overall score starts with trust_score
  COALESCE(p.trust_score, 50)::NUMERIC,
  now()
FROM profiles p
WHERE p.onboarding_completed = true
  AND p.account_type = 'creator'
ON CONFLICT (creator_id) DO UPDATE SET
  total_campaigns_completed = EXCLUDED.total_campaigns_completed,
  total_boosts_completed = EXCLUDED.total_boosts_completed,
  total_videos_delivered = EXCLUDED.total_videos_delivered,
  avg_views_per_video = EXCLUDED.avg_views_per_video,
  avg_completion_rate = EXCLUDED.avg_completion_rate,
  unique_brands_worked_with = EXCLUDED.unique_brands_worked_with,
  last_active_at = EXCLUDED.last_active_at,
  overall_score = EXCLUDED.overall_score,
  last_computed_at = now(),
  updated_at = now();

-- Log the seeding
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM creator_computed_scores;
  RAISE NOTICE 'Seeded % creator computed scores', v_count;
END $$;
