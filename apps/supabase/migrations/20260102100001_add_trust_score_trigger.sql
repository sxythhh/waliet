-- Create a function to queue trust score recalculation
-- This uses pg_net to call the edge function asynchronously
CREATE OR REPLACE FUNCTION queue_trust_score_recalculation()
RETURNS TRIGGER AS $$
DECLARE
  user_id_to_update UUID;
  supabase_url TEXT;
  service_key TEXT;
BEGIN
  -- Determine which user's trust score to recalculate
  IF TG_TABLE_NAME = 'video_submissions' THEN
    user_id_to_update := COALESCE(NEW.creator_id, OLD.creator_id);
  ELSIF TG_TABLE_NAME = 'profiles' THEN
    user_id_to_update := COALESCE(NEW.id, OLD.id);
  ELSIF TG_TABLE_NAME = 'fraud_flags' THEN
    user_id_to_update := COALESCE(NEW.user_id, OLD.user_id);
  END IF;

  -- Skip if no user ID
  IF user_id_to_update IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- For video submissions, only trigger on status changes to approved/rejected
  IF TG_TABLE_NAME = 'video_submissions' AND TG_OP = 'UPDATE' THEN
    IF OLD.status = NEW.status THEN
      RETURN NEW;
    END IF;
    IF NEW.status NOT IN ('approved', 'rejected') THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Perform inline trust score calculation (simpler than async call)
  -- This recalculates and updates the profile directly
  PERFORM calculate_trust_score_for_user(user_id_to_update);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create inline trust score calculation function
CREATE OR REPLACE FUNCTION calculate_trust_score_for_user(p_user_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_account_age_days INTEGER;
  v_approved_count INTEGER;
  v_rejected_count INTEGER;
  v_total_submissions INTEGER;
  v_fraud_flag_count INTEGER;
  v_fraud_flag_permanent BOOLEAN;
  v_base_score NUMERIC := 50;
  v_account_age_bonus NUMERIC;
  v_approval_rate_bonus NUMERIC;
  v_rejection_penalty NUMERIC;
  v_fraud_history_penalty NUMERIC;
  v_permanent_fraud_penalty NUMERIC;
  v_total_score NUMERIC;
  v_previous_score NUMERIC;
BEGIN
  -- Get profile data
  SELECT
    EXTRACT(DAY FROM NOW() - created_at)::INTEGER,
    COALESCE(fraud_flag_count, 0),
    COALESCE(fraud_flag_permanent, false),
    COALESCE(trust_score, 50)
  INTO
    v_account_age_days,
    v_fraud_flag_count,
    v_fraud_flag_permanent,
    v_previous_score
  FROM profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Get submission statistics
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'approved'),
    COUNT(*) FILTER (WHERE status = 'rejected')
  INTO
    v_total_submissions,
    v_approved_count,
    v_rejected_count
  FROM video_submissions
  WHERE creator_id = p_user_id;

  -- Calculate components
  v_account_age_bonus := LEAST(20, (v_account_age_days::NUMERIC / 30.0) * 2);

  IF v_total_submissions > 0 THEN
    v_approval_rate_bonus := (v_approved_count::NUMERIC / v_total_submissions) * 20;
    v_rejection_penalty := (v_rejected_count::NUMERIC / v_total_submissions) * 15;
  ELSE
    v_approval_rate_bonus := 0;
    v_rejection_penalty := 0;
  END IF;

  v_fraud_history_penalty := v_fraud_flag_count * 10;
  v_permanent_fraud_penalty := CASE WHEN v_fraud_flag_permanent THEN 30 ELSE 0 END;

  -- Calculate total score (clamped between 0 and 100)
  v_total_score := GREATEST(0, LEAST(100,
    v_base_score + v_account_age_bonus + v_approval_rate_bonus
    - v_rejection_penalty - v_fraud_history_penalty - v_permanent_fraud_penalty
  ));

  -- Round to 2 decimal places
  v_total_score := ROUND(v_total_score, 2);

  -- Update profile
  UPDATE profiles
  SET
    trust_score = v_total_score,
    trust_score_updated_at = NOW()
  WHERE id = p_user_id;

  -- Record in history if score changed significantly
  IF ABS(v_previous_score - v_total_score) > 0.01 THEN
    INSERT INTO trust_score_history (user_id, trust_score, score_breakdown, change_reason)
    VALUES (
      p_user_id,
      v_total_score,
      jsonb_build_object(
        'baseScore', v_base_score,
        'accountAgeBonus', ROUND(v_account_age_bonus, 2),
        'approvalRateBonus', ROUND(v_approval_rate_bonus, 2),
        'rejectionPenalty', ROUND(v_rejection_penalty, 2),
        'fraudHistoryPenalty', v_fraud_history_penalty,
        'permanentFraudPenalty', v_permanent_fraud_penalty,
        'totalScore', v_total_score
      ),
      'Automatic recalculation'
    );
  END IF;

  RETURN v_total_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for automatic recalculation

-- Trigger on video submission status changes
DROP TRIGGER IF EXISTS trigger_recalculate_trust_score_on_submission ON video_submissions;
CREATE TRIGGER trigger_recalculate_trust_score_on_submission
  AFTER UPDATE OF status ON video_submissions
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('approved', 'rejected'))
  EXECUTE FUNCTION queue_trust_score_recalculation();

-- Trigger on fraud flag changes in profiles
DROP TRIGGER IF EXISTS trigger_recalculate_trust_score_on_fraud ON profiles;
CREATE TRIGGER trigger_recalculate_trust_score_on_fraud
  AFTER UPDATE OF fraud_flag_count, fraud_flag_permanent ON profiles
  FOR EACH ROW
  WHEN (
    OLD.fraud_flag_count IS DISTINCT FROM NEW.fraud_flag_count
    OR OLD.fraud_flag_permanent IS DISTINCT FROM NEW.fraud_flag_permanent
  )
  EXECUTE FUNCTION queue_trust_score_recalculation();

-- Trigger when new fraud flags are created
DROP TRIGGER IF EXISTS trigger_recalculate_trust_score_on_new_fraud ON fraud_flags;
CREATE TRIGGER trigger_recalculate_trust_score_on_new_fraud
  AFTER INSERT ON fraud_flags
  FOR EACH ROW
  EXECUTE FUNCTION queue_trust_score_recalculation();
