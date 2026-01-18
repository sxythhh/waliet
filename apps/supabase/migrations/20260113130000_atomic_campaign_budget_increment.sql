-- Migration: Atomic campaign budget increment
-- Fixes race condition where concurrent payments can cause budget_used to be under-counted
-- When multiple payments fire simultaneously, they read the same budget_used value,
-- calculate the same new value, and one overwrites the other.

-- Create atomic increment function for campaign budget_used
CREATE OR REPLACE FUNCTION increment_campaign_budget_used(
  p_campaign_id uuid,
  p_amount numeric
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_budget_used numeric;
BEGIN
  UPDATE campaigns
  SET budget_used = COALESCE(budget_used, 0) + p_amount,
      updated_at = now()
  WHERE id = p_campaign_id
  RETURNING budget_used INTO v_new_budget_used;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Campaign not found: %', p_campaign_id;
  END IF;

  RETURN v_new_budget_used;
END;
$$;

-- Create atomic decrement function for undo operations
CREATE OR REPLACE FUNCTION decrement_campaign_budget_used(
  p_campaign_id uuid,
  p_amount numeric
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_budget_used numeric;
BEGIN
  UPDATE campaigns
  SET budget_used = GREATEST(0, COALESCE(budget_used, 0) - p_amount),
      updated_at = now()
  WHERE id = p_campaign_id
  RETURNING budget_used INTO v_new_budget_used;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Campaign not found: %', p_campaign_id;
  END IF;

  RETURN v_new_budget_used;
END;
$$;

-- Also create atomic increment for bounty_campaigns (boosts)
CREATE OR REPLACE FUNCTION increment_boost_budget_used(
  p_boost_id uuid,
  p_amount numeric
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_budget_used numeric;
BEGIN
  UPDATE bounty_campaigns
  SET budget_used = COALESCE(budget_used, 0) + p_amount,
      updated_at = now()
  WHERE id = p_boost_id
  RETURNING budget_used INTO v_new_budget_used;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Boost campaign not found: %', p_boost_id;
  END IF;

  RETURN v_new_budget_used;
END;
$$;

CREATE OR REPLACE FUNCTION decrement_boost_budget_used(
  p_boost_id uuid,
  p_amount numeric
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_budget_used numeric;
BEGIN
  UPDATE bounty_campaigns
  SET budget_used = GREATEST(0, COALESCE(budget_used, 0) - p_amount),
      updated_at = now()
  WHERE id = p_boost_id
  RETURNING budget_used INTO v_new_budget_used;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Boost campaign not found: %', p_boost_id;
  END IF;

  RETURN v_new_budget_used;
END;
$$;

-- Grant execute permissions to authenticated users and service role
GRANT EXECUTE ON FUNCTION increment_campaign_budget_used(uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_campaign_budget_used(uuid, numeric) TO service_role;
GRANT EXECUTE ON FUNCTION decrement_campaign_budget_used(uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION decrement_campaign_budget_used(uuid, numeric) TO service_role;
GRANT EXECUTE ON FUNCTION increment_boost_budget_used(uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_boost_budget_used(uuid, numeric) TO service_role;
GRANT EXECUTE ON FUNCTION decrement_boost_budget_used(uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION decrement_boost_budget_used(uuid, numeric) TO service_role;

COMMENT ON FUNCTION increment_campaign_budget_used IS 'Atomically increments campaign budget_used to prevent race conditions in concurrent payments';
COMMENT ON FUNCTION decrement_campaign_budget_used IS 'Atomically decrements campaign budget_used for undo operations';
COMMENT ON FUNCTION increment_boost_budget_used IS 'Atomically increments boost budget_used to prevent race conditions';
COMMENT ON FUNCTION decrement_boost_budget_used IS 'Atomically decrements boost budget_used for undo operations';
