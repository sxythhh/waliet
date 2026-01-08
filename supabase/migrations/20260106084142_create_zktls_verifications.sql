-- Create zkTLS verifications table for storing cryptographic proofs
CREATE TABLE IF NOT EXISTS zktls_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  social_account_id UUID REFERENCES social_accounts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Proof data
  proof_id TEXT NOT NULL,
  proof_data JSONB NOT NULL,
  provider_id TEXT NOT NULL,

  -- Video-specific data (TikTok provider is per-video)
  video_id TEXT,

  -- Extracted metrics
  follower_count INTEGER,
  demographics JSONB,
  engagement_rate NUMERIC(5,2),
  avg_views INTEGER,

  -- Video performance metrics (from TikTok provider)
  video_metrics JSONB,

  -- Public data from Reclaim (additional extracted info)
  public_data JSONB,

  -- Verification metadata
  verified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 days'),
  is_valid BOOLEAN DEFAULT true,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT unique_social_account_video UNIQUE (social_account_id, video_id)
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_zktls_social_account ON zktls_verifications(social_account_id);
CREATE INDEX IF NOT EXISTS idx_zktls_user ON zktls_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_zktls_valid ON zktls_verifications(is_valid, verified_at DESC);
CREATE INDEX IF NOT EXISTS idx_zktls_expires ON zktls_verifications(expires_at) WHERE is_valid = true;

-- Add zkTLS columns to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS zktls_verified_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS zktls_trust_level TEXT DEFAULT 'none';

-- Add zkTLS columns to social_accounts table
ALTER TABLE social_accounts ADD COLUMN IF NOT EXISTS last_zktls_verification_id UUID REFERENCES zktls_verifications(id);
ALTER TABLE social_accounts ADD COLUMN IF NOT EXISTS zktls_verified BOOLEAN DEFAULT false;
ALTER TABLE social_accounts ADD COLUMN IF NOT EXISTS zktls_follower_count INTEGER;
ALTER TABLE social_accounts ADD COLUMN IF NOT EXISTS zktls_demographics JSONB;
ALTER TABLE social_accounts ADD COLUMN IF NOT EXISTS zktls_engagement_rate NUMERIC(5,2);
ALTER TABLE social_accounts ADD COLUMN IF NOT EXISTS zktls_avg_views INTEGER;
ALTER TABLE social_accounts ADD COLUMN IF NOT EXISTS zktls_verified_at TIMESTAMPTZ;
ALTER TABLE social_accounts ADD COLUMN IF NOT EXISTS zktls_expires_at TIMESTAMPTZ;

-- Function to check if a verification is expired
CREATE OR REPLACE FUNCTION is_zktls_verification_expired(verification_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  exp_at TIMESTAMPTZ;
BEGIN
  SELECT expires_at INTO exp_at FROM zktls_verifications WHERE id = verification_id;
  RETURN exp_at IS NULL OR exp_at < now();
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to calculate zkTLS trust score bonus
CREATE OR REPLACE FUNCTION calculate_zktls_trust_bonus(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  valid_count INTEGER;
  recent_count INTEGER;
  bonus INTEGER := 0;
BEGIN
  -- Count valid (non-expired) verifications
  SELECT COUNT(*) INTO valid_count
  FROM social_accounts sa
  WHERE sa.user_id = p_user_id
    AND sa.zktls_verified = true
    AND sa.zktls_expires_at > now();

  -- Count recent verifications (< 7 days old)
  SELECT COUNT(*) INTO recent_count
  FROM social_accounts sa
  WHERE sa.user_id = p_user_id
    AND sa.zktls_verified = true
    AND sa.zktls_verified_at > now() - INTERVAL '7 days';

  -- Base bonus: +20 for having any valid verification
  IF valid_count > 0 THEN
    bonus := 20;
  END IF;

  -- Recency bonus: +10 for verification in last 7 days
  IF recent_count > 0 THEN
    bonus := bonus + 10;
  END IF;

  RETURN bonus;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to update user's zkTLS trust level
CREATE OR REPLACE FUNCTION update_zktls_trust_level(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  valid_count INTEGER;
  expired_count INTEGER;
  new_level TEXT;
BEGIN
  -- Count valid verifications
  SELECT COUNT(*) INTO valid_count
  FROM social_accounts sa
  WHERE sa.user_id = p_user_id
    AND sa.zktls_verified = true
    AND sa.zktls_expires_at > now();

  -- Count expired verifications (had verification but now expired)
  SELECT COUNT(*) INTO expired_count
  FROM social_accounts sa
  WHERE sa.user_id = p_user_id
    AND sa.zktls_verified = false
    AND sa.last_zktls_verification_id IS NOT NULL;

  -- Determine trust level
  IF valid_count > 0 THEN
    new_level := 'verified';
  ELSIF expired_count > 0 THEN
    new_level := 'basic';
  ELSE
    new_level := 'none';
  END IF;

  -- Update profile
  UPDATE profiles
  SET zktls_trust_level = new_level,
      zktls_verified_at = CASE WHEN valid_count > 0 THEN now() ELSE zktls_verified_at END
  WHERE id = p_user_id;

  RETURN new_level;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update social_account when verification is added
CREATE OR REPLACE FUNCTION on_zktls_verification_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the social account with verified data
  UPDATE social_accounts
  SET
    last_zktls_verification_id = NEW.id,
    zktls_verified = true,
    zktls_follower_count = NEW.follower_count,
    zktls_demographics = NEW.demographics,
    zktls_engagement_rate = NEW.engagement_rate,
    zktls_avg_views = NEW.avg_views,
    zktls_verified_at = NEW.verified_at,
    zktls_expires_at = NEW.expires_at
  WHERE id = NEW.social_account_id;

  -- Update user's trust level
  PERFORM update_zktls_trust_level(NEW.user_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_zktls_verification_insert
AFTER INSERT ON zktls_verifications
FOR EACH ROW
EXECUTE FUNCTION on_zktls_verification_insert();

-- RLS policies for zktls_verifications
ALTER TABLE zktls_verifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own verifications
CREATE POLICY "Users can view own zktls verifications"
ON zktls_verifications FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can insert their own verifications (via edge function)
CREATE POLICY "Users can insert own zktls verifications"
ON zktls_verifications FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Service role can do everything (for edge functions)
CREATE POLICY "Service role full access to zktls verifications"
ON zktls_verifications FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Add comment for documentation
COMMENT ON TABLE zktls_verifications IS 'Stores zkTLS cryptographic proofs for verified creator analytics from Reclaim Protocol';
