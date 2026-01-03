-- Audience Insights System Improvements
-- 1. Add campaign columns for insights requirements
-- 2. Create function to calculate aggregate score
-- 3. Create trigger to update profile score after approval

-- Add campaign columns for audience insights requirements
ALTER TABLE public.campaigns
ADD COLUMN IF NOT EXISTS require_audience_insights BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS min_insights_score INTEGER DEFAULT 0
  CHECK (min_insights_score >= 0 AND min_insights_score <= 100);

COMMENT ON COLUMN campaigns.require_audience_insights IS 'Whether creators must have approved audience insights to apply';
COMMENT ON COLUMN campaigns.min_insights_score IS 'Minimum insights score required (0-100)';

-- Function to calculate weighted average score across all social accounts for a user
CREATE OR REPLACE FUNCTION calculate_audience_insights_score(p_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(ROUND(AVG(ds.score))::INTEGER, 0)
  FROM demographic_submissions ds
  JOIN social_accounts sa ON ds.social_account_id = sa.id
  WHERE sa.user_id = p_user_id
    AND ds.status = 'approved'
    AND ds.score IS NOT NULL
    -- Only consider the latest approved submission per account
    AND ds.submitted_at = (
      SELECT MAX(ds2.submitted_at)
      FROM demographic_submissions ds2
      WHERE ds2.social_account_id = ds.social_account_id
        AND ds2.status = 'approved'
    );
$$;

-- Trigger function to update profile.demographics_score after submission approval
CREATE OR REPLACE FUNCTION update_profile_insights_score()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get the user_id for this social account
  SELECT user_id INTO v_user_id
  FROM social_accounts
  WHERE id = NEW.social_account_id;

  -- Update the profile's demographics_score
  IF v_user_id IS NOT NULL THEN
    UPDATE profiles
    SET demographics_score = calculate_audience_insights_score(v_user_id)
    WHERE id = v_user_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger (drop first if exists to avoid duplicate)
DROP TRIGGER IF EXISTS trg_update_insights_score ON demographic_submissions;

CREATE TRIGGER trg_update_insights_score
AFTER UPDATE OF status ON demographic_submissions
FOR EACH ROW
WHEN (NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved')
EXECUTE FUNCTION update_profile_insights_score();

-- Also trigger on insert if status is immediately approved (edge case)
DROP TRIGGER IF EXISTS trg_update_insights_score_insert ON demographic_submissions;

CREATE TRIGGER trg_update_insights_score_insert
AFTER INSERT ON demographic_submissions
FOR EACH ROW
WHEN (NEW.status = 'approved')
EXECUTE FUNCTION update_profile_insights_score();
