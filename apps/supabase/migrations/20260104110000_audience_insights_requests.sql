-- Audience Insights Request System
-- Allows brands to request creators submit their audience insights

CREATE TABLE public.audience_insights_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  social_account_id UUID REFERENCES social_accounts(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'submitted', 'expired', 'declined')),
  requested_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '7 days'),
  responded_at TIMESTAMPTZ,
  submission_id UUID REFERENCES demographic_submissions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Prevent duplicate pending requests for the same creator/account from the same brand
CREATE UNIQUE INDEX idx_unique_pending_insights_request
ON audience_insights_requests(brand_id, creator_id, social_account_id)
WHERE status = 'pending';

-- Indexes for common queries
CREATE INDEX idx_insights_requests_creator ON audience_insights_requests(creator_id, status);
CREATE INDEX idx_insights_requests_brand ON audience_insights_requests(brand_id, status);
CREATE INDEX idx_insights_requests_expires ON audience_insights_requests(expires_at) WHERE status = 'pending';

-- Enable RLS
ALTER TABLE audience_insights_requests ENABLE ROW LEVEL SECURITY;

-- Creators can view requests sent to them
CREATE POLICY "Creators can view own insight requests"
ON audience_insights_requests FOR SELECT
USING (creator_id = auth.uid());

-- Brand members can view requests their brand has sent
CREATE POLICY "Brand members can view sent insight requests"
ON audience_insights_requests FOR SELECT
USING (brand_id IN (
  SELECT brand_id FROM brand_members WHERE user_id = auth.uid()
));

-- Brand members can create requests
CREATE POLICY "Brand members can create insight requests"
ON audience_insights_requests FOR INSERT
WITH CHECK (brand_id IN (
  SELECT brand_id FROM brand_members WHERE user_id = auth.uid()
));

-- Creators can respond to (update) requests sent to them
CREATE POLICY "Creators can respond to insight requests"
ON audience_insights_requests FOR UPDATE
USING (creator_id = auth.uid())
WITH CHECK (creator_id = auth.uid());

-- Brand members can cancel their requests
CREATE POLICY "Brand members can cancel insight requests"
ON audience_insights_requests FOR UPDATE
USING (
  brand_id IN (SELECT brand_id FROM brand_members WHERE user_id = auth.uid())
  AND status = 'pending'
)
WITH CHECK (
  brand_id IN (SELECT brand_id FROM brand_members WHERE user_id = auth.uid())
);

-- Function to auto-expire old requests (can be called by cron)
CREATE OR REPLACE FUNCTION expire_old_insights_requests()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE audience_insights_requests
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < now();

  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$;

-- Comments for documentation
COMMENT ON TABLE audience_insights_requests IS 'Tracks brand requests for creators to submit audience insights';
COMMENT ON COLUMN audience_insights_requests.status IS 'pending = awaiting response, submitted = creator submitted insights, expired = request expired, declined = creator declined';
COMMENT ON COLUMN audience_insights_requests.submission_id IS 'Links to the demographic_submission if creator submitted in response to this request';
