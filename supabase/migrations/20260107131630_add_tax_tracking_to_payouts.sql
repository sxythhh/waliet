-- Add tax form verification and withholding tracking to payout requests
-- This ensures tax compliance before processing payouts

-- Add tax verification fields to payout_requests
ALTER TABLE payout_requests ADD COLUMN IF NOT EXISTS tax_form_verified BOOLEAN DEFAULT false;
ALTER TABLE payout_requests ADD COLUMN IF NOT EXISTS tax_form_id UUID REFERENCES tax_forms(id);
ALTER TABLE payout_requests ADD COLUMN IF NOT EXISTS withholding_rate DECIMAL(5,2) DEFAULT 0;
ALTER TABLE payout_requests ADD COLUMN IF NOT EXISTS withholding_amount DECIMAL(12,2) DEFAULT 0;
ALTER TABLE payout_requests ADD COLUMN IF NOT EXISTS net_amount DECIMAL(12,2);

-- Create index for tax form lookups
CREATE INDEX IF NOT EXISTS idx_payout_requests_tax_form_id ON payout_requests(tax_form_id);

-- Comments for documentation
COMMENT ON COLUMN payout_requests.tax_form_verified IS 'Whether required tax form has been verified for this payout';
COMMENT ON COLUMN payout_requests.tax_form_id IS 'Reference to the tax form used for this payout';
COMMENT ON COLUMN payout_requests.withholding_rate IS 'Tax withholding rate applied (0 for US, up to 30% for non-US)';
COMMENT ON COLUMN payout_requests.withholding_amount IS 'Amount withheld for taxes';
COMMENT ON COLUMN payout_requests.net_amount IS 'Amount after withholding (amount - withholding_amount)';

-- Function to check if tax form is required for a user
CREATE OR REPLACE FUNCTION check_tax_form_required(p_user_id UUID, p_payout_amount DECIMAL)
RETURNS TABLE(
  required BOOLEAN,
  form_type TEXT,
  reason TEXT,
  existing_form_id UUID,
  existing_form_status TEXT,
  cumulative_payouts DECIMAL,
  threshold DECIMAL
) AS $$
DECLARE
  v_tax_country TEXT;
  v_cumulative DECIMAL;
  v_current_year INTEGER;
  v_form RECORD;
  v_threshold DECIMAL := 600.00;
BEGIN
  -- Get user's tax country and cumulative payouts
  SELECT
    p.tax_country,
    COALESCE(p.cumulative_payouts_ytd, 0),
    COALESCE(p.cumulative_payouts_year, EXTRACT(YEAR FROM NOW())::INTEGER)
  INTO v_tax_country, v_cumulative, v_current_year
  FROM profiles p
  WHERE p.id = p_user_id;

  -- Reset cumulative if it's a new year
  IF v_current_year < EXTRACT(YEAR FROM NOW())::INTEGER THEN
    v_cumulative := 0;
  END IF;

  -- Get latest verified or pending tax form
  SELECT tf.id, tf.form_type, tf.status, tf.expires_at
  INTO v_form
  FROM tax_forms tf
  WHERE tf.user_id = p_user_id
    AND tf.status IN ('verified', 'pending')
    AND (tf.expires_at IS NULL OR tf.expires_at > NOW())
  ORDER BY
    CASE tf.status WHEN 'verified' THEN 1 WHEN 'pending' THEN 2 ELSE 3 END,
    tf.created_at DESC
  LIMIT 1;

  -- Determine if form is required
  IF v_tax_country IS NULL THEN
    -- No tax country set - need to determine first
    RETURN QUERY SELECT
      true,
      NULL::TEXT,
      'no_tax_country'::TEXT,
      NULL::UUID,
      NULL::TEXT,
      v_cumulative,
      v_threshold;
  ELSIF UPPER(v_tax_country) = 'US' THEN
    -- US person: W-9 required at $600 threshold
    IF (v_cumulative + p_payout_amount) >= v_threshold THEN
      IF v_form.id IS NULL THEN
        RETURN QUERY SELECT
          true,
          'w9'::TEXT,
          'threshold_reached'::TEXT,
          NULL::UUID,
          NULL::TEXT,
          v_cumulative,
          v_threshold;
      ELSIF v_form.form_type != 'w9' THEN
        RETURN QUERY SELECT
          true,
          'w9'::TEXT,
          'wrong_form_type'::TEXT,
          v_form.id,
          v_form.status,
          v_cumulative,
          v_threshold;
      ELSE
        -- Has valid W-9
        RETURN QUERY SELECT
          false,
          'w9'::TEXT,
          'not_required'::TEXT,
          v_form.id,
          v_form.status,
          v_cumulative,
          v_threshold;
      END IF;
    ELSE
      -- Under threshold, no form required
      RETURN QUERY SELECT
        false,
        NULL::TEXT,
        'under_threshold'::TEXT,
        v_form.id,
        v_form.status,
        v_cumulative,
        v_threshold;
    END IF;
  ELSE
    -- Non-US person: W-8BEN required for any payout
    IF v_form.id IS NULL THEN
      RETURN QUERY SELECT
        true,
        'w8ben'::TEXT,
        'non_us_no_form'::TEXT,
        NULL::UUID,
        NULL::TEXT,
        v_cumulative,
        0::DECIMAL;
    ELSIF v_form.form_type NOT IN ('w8ben', 'w8bene') THEN
      RETURN QUERY SELECT
        true,
        'w8ben'::TEXT,
        'wrong_form_type'::TEXT,
        v_form.id,
        v_form.status,
        v_cumulative,
        0::DECIMAL;
    ELSIF v_form.expires_at IS NOT NULL AND v_form.expires_at <= NOW() THEN
      RETURN QUERY SELECT
        true,
        'w8ben'::TEXT,
        'form_expired'::TEXT,
        v_form.id,
        'expired'::TEXT,
        v_cumulative,
        0::DECIMAL;
    ELSE
      -- Has valid W-8BEN
      RETURN QUERY SELECT
        false,
        'w8ben'::TEXT,
        'not_required'::TEXT,
        v_form.id,
        v_form.status,
        v_cumulative,
        0::DECIMAL;
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate withholding rate based on form type and treaty
CREATE OR REPLACE FUNCTION get_withholding_rate(p_user_id UUID, p_tax_form_id UUID)
RETURNS DECIMAL AS $$
DECLARE
  v_form RECORD;
  v_tax_country TEXT;
  v_treaty_rate DECIMAL;
BEGIN
  -- Get user's tax country
  SELECT tax_country INTO v_tax_country
  FROM profiles
  WHERE id = p_user_id;

  -- US persons: no withholding (we report via 1099)
  IF UPPER(v_tax_country) = 'US' THEN
    RETURN 0;
  END IF;

  -- Get tax form data
  SELECT form_type, form_data INTO v_form
  FROM tax_forms
  WHERE id = p_tax_form_id AND user_id = p_user_id;

  IF v_form IS NULL THEN
    -- No valid form, default to 30%
    RETURN 30;
  END IF;

  -- Check for treaty benefits claim
  IF v_form.form_type IN ('w8ben', 'w8bene') AND
     (v_form.form_data->>'claimTreatyBenefits')::boolean = true AND
     v_form.form_data->>'treatyRate' IS NOT NULL THEN
    v_treaty_rate := (v_form.form_data->>'treatyRate')::DECIMAL;
    -- Validate treaty rate is reasonable (0-30%)
    IF v_treaty_rate >= 0 AND v_treaty_rate <= 30 THEN
      RETURN v_treaty_rate;
    END IF;
  END IF;

  -- Default non-US rate without treaty: 30%
  RETURN 30;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update cumulative payouts after successful payout
CREATE OR REPLACE FUNCTION update_cumulative_payouts(p_user_id UUID, p_amount DECIMAL)
RETURNS VOID AS $$
DECLARE
  v_current_year INTEGER := EXTRACT(YEAR FROM NOW())::INTEGER;
BEGIN
  UPDATE profiles
  SET
    cumulative_payouts_ytd = CASE
      WHEN cumulative_payouts_year = v_current_year THEN COALESCE(cumulative_payouts_ytd, 0) + p_amount
      ELSE p_amount
    END,
    cumulative_payouts_year = v_current_year
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION check_tax_form_required(UUID, DECIMAL) TO authenticated;
GRANT EXECUTE ON FUNCTION get_withholding_rate(UUID, UUID) TO authenticated;
