-- Fraud Detection System Migration
-- Implements automated fraud detection, evidence collection, and admin review workflow

-- ============================================
-- 1. New Tables
-- ============================================

-- Fraud flags table - tracks detected fraud signals
CREATE TABLE IF NOT EXISTS fraud_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  payout_request_id UUID REFERENCES submission_payout_requests(id) ON DELETE SET NULL,
  submission_id UUID, -- Can reference video_submissions or campaign_submissions
  source_type TEXT, -- 'campaign' or 'boost'
  flag_type TEXT NOT NULL CHECK (flag_type IN ('engagement', 'velocity', 'new_creator', 'previous_fraud', 'manual')),
  flag_reason TEXT,
  detected_value NUMERIC, -- e.g., 0.05 for 0.05% engagement
  threshold_value NUMERIC, -- e.g., 0.1 for 0.1% threshold
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES profiles(id),
  resolution_notes TEXT
);

-- Fraud evidence table - stores screen recordings and links
CREATE TABLE IF NOT EXISTS fraud_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_request_id UUID NOT NULL REFERENCES submission_payout_requests(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  evidence_type TEXT NOT NULL CHECK (evidence_type IN ('screen_recording', 'external_link')),
  file_path TEXT, -- Supabase Storage path
  file_size_bytes BIGINT,
  external_url TEXT, -- For link fallback
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ, -- 30 days after payout completion
  admin_notes TEXT,
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  review_status TEXT CHECK (review_status IN ('pending', 'approved', 'rejected'))
);

-- Creator fraud history - permanent record of confirmed fraud
CREATE TABLE IF NOT EXISTS creator_fraud_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  fraud_flag_id UUID REFERENCES fraud_flags(id) ON DELETE SET NULL,
  fraud_type TEXT NOT NULL,
  fraud_amount NUMERIC NOT NULL DEFAULT 0,
  trust_penalty INTEGER NOT NULL DEFAULT 0,
  clawback_ledger_id UUID, -- References payment_ledger if clawback executed
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Banned devices table - for Fingerprint.js enforcement
CREATE TABLE IF NOT EXISTS banned_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fingerprint_id TEXT NOT NULL,
  ip_address INET,
  creator_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- Original banned creator
  ban_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ, -- NULL = permanent
  UNIQUE(fingerprint_id)
);

-- ============================================
-- 2. Profile Extensions
-- ============================================

-- Add fraud-related columns to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS fraud_flag_permanent BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS fraud_flag_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_fraud_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS banned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ban_reason TEXT,
  ADD COLUMN IF NOT EXISTS device_fingerprint TEXT;

-- ============================================
-- 3. Brand Extensions
-- ============================================

-- Add fraud sensitivity settings to brands
ALTER TABLE brands
  ADD COLUMN IF NOT EXISTS fraud_sensitivity TEXT DEFAULT 'normal' CHECK (fraud_sensitivity IN ('strict', 'normal', 'lenient')),
  ADD COLUMN IF NOT EXISTS notify_creator_fraud BOOLEAN DEFAULT false;

-- ============================================
-- 4. Payout Request Extensions
-- ============================================

-- Add fraud workflow columns to submission_payout_requests
ALTER TABLE submission_payout_requests
  ADD COLUMN IF NOT EXISTS auto_approval_status TEXT CHECK (auto_approval_status IN ('approved', 'failed', 'pending_evidence', 'pending_review')),
  ADD COLUMN IF NOT EXISTS evidence_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS evidence_deadline TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS views_snapshot JSONB DEFAULT '{}', -- Snapshot of views at request time
  ADD COLUMN IF NOT EXISTS fraud_check_result JSONB DEFAULT '{}', -- Result of fraud check
  ADD COLUMN IF NOT EXISTS appeal_submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS appeal_evidence_id UUID REFERENCES fraud_evidence(id),
  ADD COLUMN IF NOT EXISTS appeal_status TEXT CHECK (appeal_status IN ('pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS appeal_resolved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS appeal_resolved_by UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- ============================================
-- 5. Indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_fraud_flags_creator ON fraud_flags(creator_id);
CREATE INDEX IF NOT EXISTS idx_fraud_flags_payout ON fraud_flags(payout_request_id);
CREATE INDEX IF NOT EXISTS idx_fraud_flags_status ON fraud_flags(status);
CREATE INDEX IF NOT EXISTS idx_fraud_flags_type ON fraud_flags(flag_type);
CREATE INDEX IF NOT EXISTS idx_fraud_evidence_payout ON fraud_evidence(payout_request_id);
CREATE INDEX IF NOT EXISTS idx_fraud_evidence_creator ON fraud_evidence(creator_id);
CREATE INDEX IF NOT EXISTS idx_fraud_history_creator ON creator_fraud_history(creator_id);
CREATE INDEX IF NOT EXISTS idx_banned_devices_fingerprint ON banned_devices(fingerprint_id);
CREATE INDEX IF NOT EXISTS idx_banned_devices_ip ON banned_devices(ip_address);
CREATE INDEX IF NOT EXISTS idx_payout_requests_auto_approval ON submission_payout_requests(auto_approval_status);
CREATE INDEX IF NOT EXISTS idx_payout_requests_evidence_deadline ON submission_payout_requests(evidence_deadline) WHERE evidence_deadline IS NOT NULL;

-- ============================================
-- 6. RLS Policies
-- ============================================

ALTER TABLE fraud_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE fraud_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_fraud_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE banned_devices ENABLE ROW LEVEL SECURITY;

-- Fraud flags: creators see their own, admins see all
CREATE POLICY "Creators can view own fraud flags"
  ON fraud_flags FOR SELECT
  TO authenticated
  USING (creator_id = auth.uid());

CREATE POLICY "Admins can manage all fraud flags"
  ON fraud_flags FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE has_role(auth.uid(), 'admin'::app_role)
    )
  );

-- Fraud evidence: creators can view/insert own, admins can manage all
CREATE POLICY "Creators can view own evidence"
  ON fraud_evidence FOR SELECT
  TO authenticated
  USING (creator_id = auth.uid());

CREATE POLICY "Creators can upload evidence"
  ON fraud_evidence FOR INSERT
  TO authenticated
  WITH CHECK (creator_id = auth.uid());

CREATE POLICY "Admins can manage all evidence"
  ON fraud_evidence FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE has_role(auth.uid(), 'admin'::app_role)
    )
  );

-- Fraud history: admins only
CREATE POLICY "Admins can manage fraud history"
  ON creator_fraud_history FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE has_role(auth.uid(), 'admin'::app_role)
    )
  );

-- Banned devices: admins only
CREATE POLICY "Admins can manage banned devices"
  ON banned_devices FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE has_role(auth.uid(), 'admin'::app_role)
    )
  );

-- Service role can do everything
CREATE POLICY "Service role full access to fraud_flags"
  ON fraud_flags FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Service role full access to fraud_evidence"
  ON fraud_evidence FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Service role full access to creator_fraud_history"
  ON creator_fraud_history FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Service role full access to banned_devices"
  ON banned_devices FOR ALL
  TO service_role
  USING (true);

-- ============================================
-- 7. Storage Bucket for Evidence
-- ============================================

-- Note: Run this in Supabase dashboard or via API
-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- ON CONFLICT handled below
-- VALUES (
--   'fraud-evidence',
--   'fraud-evidence',
--   false,
--   104857600, -- 100 MB
--   ARRAY['video/mp4', 'video/quicktime', 'video/webm']
-- );

-- ============================================
-- 8. Helper Functions
-- ============================================

-- Function to check if creator is banned
CREATE OR REPLACE FUNCTION is_creator_banned(p_creator_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = p_creator_id
    AND banned_at IS NOT NULL
  );
END;
$$;

-- Function to check if device is banned
CREATE OR REPLACE FUNCTION is_device_banned(p_fingerprint TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM banned_devices
    WHERE fingerprint_id = p_fingerprint
    AND (expires_at IS NULL OR expires_at > now())
  );
END;
$$;

-- Function to get fraud sensitivity thresholds
CREATE OR REPLACE FUNCTION get_fraud_thresholds(p_sensitivity TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN CASE p_sensitivity
    WHEN 'strict' THEN '{"engagement_rate": 0.0015, "velocity_multiplier": 10}'::jsonb
    WHEN 'lenient' THEN '{"engagement_rate": 0.0005, "velocity_multiplier": 10}'::jsonb
    ELSE '{"engagement_rate": 0.001, "velocity_multiplier": 10}'::jsonb -- normal
  END;
END;
$$;

-- Function to calculate trust penalty
CREATE OR REPLACE FUNCTION calculate_trust_penalty(p_fraud_amount NUMERIC)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  base_penalty INTEGER := 10;
  amount_multiplier NUMERIC := 0.01;
BEGIN
  RETURN base_penalty + FLOOR(p_fraud_amount * amount_multiplier)::INTEGER;
END;
$$;

-- Function to get auto-approval thresholds by tier
CREATE OR REPLACE FUNCTION get_approval_thresholds(p_amount NUMERIC)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Tiers: micro ($0-50), small ($50-200), medium ($200-1000), large ($1000+)
  IF p_amount <= 50 THEN
    RETURN '{"tier": "micro", "min_trust_score": 60, "min_account_age_days": 0, "min_successful_payouts": 0}'::jsonb;
  ELSIF p_amount <= 200 THEN
    RETURN '{"tier": "small", "min_trust_score": 70, "min_account_age_days": 14, "min_successful_payouts": 0}'::jsonb;
  ELSIF p_amount <= 1000 THEN
    RETURN '{"tier": "medium", "min_trust_score": 80, "min_account_age_days": 30, "min_successful_payouts": 3}'::jsonb;
  ELSE
    RETURN '{"tier": "large", "min_trust_score": 90, "min_account_age_days": 60, "min_successful_payouts": 5}'::jsonb;
  END IF;
END;
$$;
