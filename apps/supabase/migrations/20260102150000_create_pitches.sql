-- Create pitches table for creator-brand pitch system
CREATE TABLE IF NOT EXISTS pitches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('creator_to_brand', 'brand_to_creator')),
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  boost_id UUID REFERENCES bounty_campaigns(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  portfolio_links TEXT[] DEFAULT '{}',
  proposed_rate NUMERIC,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  response_message TEXT,
  responded_at TIMESTAMPTZ,
  responded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),

  -- Ensure at least one of campaign_id or boost_id is set for creator_to_brand pitches
  CONSTRAINT pitch_target_check CHECK (
    type = 'brand_to_creator' OR campaign_id IS NOT NULL OR boost_id IS NOT NULL
  )
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_pitches_creator_id ON pitches(creator_id);
CREATE INDEX IF NOT EXISTS idx_pitches_brand_id ON pitches(brand_id);
CREATE INDEX IF NOT EXISTS idx_pitches_campaign_id ON pitches(campaign_id) WHERE campaign_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pitches_boost_id ON pitches(boost_id) WHERE boost_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pitches_status ON pitches(status);
CREATE INDEX IF NOT EXISTS idx_pitches_type ON pitches(type);
CREATE INDEX IF NOT EXISTS idx_pitches_created_at ON pitches(created_at DESC);

-- Enable RLS
ALTER TABLE pitches ENABLE ROW LEVEL SECURITY;

-- Creators can view their own pitches
DROP POLICY IF EXISTS "Creators can view own pitches" ON pitches;
CREATE POLICY "Creators can view own pitches"
  ON pitches FOR SELECT
  TO authenticated
  USING (creator_id = auth.uid());

-- Brand members can view pitches for their brands
DROP POLICY IF EXISTS "Brand members can view brand pitches" ON pitches;
CREATE POLICY "Brand members can view brand pitches"
  ON pitches FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM brand_members
      WHERE brand_members.brand_id = pitches.brand_id
      AND brand_members.user_id = auth.uid()
    )
  );

-- Creators can create pitches to brands
DROP POLICY IF EXISTS "Creators can create pitches to brands" ON pitches;
CREATE POLICY "Creators can create pitches to brands"
  ON pitches FOR INSERT
  TO authenticated
  WITH CHECK (
    creator_id = auth.uid() AND type = 'creator_to_brand'
  );

-- Brand members can create pitches to creators
DROP POLICY IF EXISTS "Brand members can create pitches to creators" ON pitches;
CREATE POLICY "Brand members can create pitches to creators"
  ON pitches FOR INSERT
  TO authenticated
  WITH CHECK (
    type = 'brand_to_creator' AND
    EXISTS (
      SELECT 1 FROM brand_members
      WHERE brand_members.brand_id = pitches.brand_id
      AND brand_members.user_id = auth.uid()
      AND brand_members.role IN ('owner', 'admin', 'manager')
    )
  );

-- Brand members can update pitch status (accept/reject)
DROP POLICY IF EXISTS "Brand members can update pitch status" ON pitches;
CREATE POLICY "Brand members can update pitch status"
  ON pitches FOR UPDATE
  TO authenticated
  USING (
    type = 'creator_to_brand' AND
    EXISTS (
      SELECT 1 FROM brand_members
      WHERE brand_members.brand_id = pitches.brand_id
      AND brand_members.user_id = auth.uid()
      AND brand_members.role IN ('owner', 'admin', 'manager')
    )
  )
  WITH CHECK (
    type = 'creator_to_brand' AND
    EXISTS (
      SELECT 1 FROM brand_members
      WHERE brand_members.brand_id = pitches.brand_id
      AND brand_members.user_id = auth.uid()
      AND brand_members.role IN ('owner', 'admin', 'manager')
    )
  );

-- Creators can update brand-to-creator pitch status (accept/reject)
DROP POLICY IF EXISTS "Creators can update brand pitch status" ON pitches;
CREATE POLICY "Creators can update brand pitch status"
  ON pitches FOR UPDATE
  TO authenticated
  USING (
    type = 'brand_to_creator' AND creator_id = auth.uid()
  )
  WITH CHECK (
    type = 'brand_to_creator' AND creator_id = auth.uid()
  );

-- Function to auto-add creator to campaign/boost when pitch is accepted
CREATE OR REPLACE FUNCTION handle_pitch_acceptance()
RETURNS TRIGGER AS $$
BEGIN
  -- Only run when status changes to 'accepted'
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    -- Set responded_at timestamp
    NEW.responded_at = NOW();

    -- If pitch was for a campaign, add creator to campaign
    IF NEW.campaign_id IS NOT NULL THEN
      INSERT INTO campaign_participants (campaign_id, user_id, status, joined_at)
      VALUES (NEW.campaign_id, NEW.creator_id, 'accepted', NOW())
      ON CONFLICT (campaign_id, user_id) DO UPDATE SET status = 'accepted';
    END IF;

    -- If pitch was for a boost, add creator to boost
    IF NEW.boost_id IS NOT NULL THEN
      INSERT INTO bounty_applications (bounty_id, user_id, status, applied_at)
      VALUES (NEW.boost_id, NEW.creator_id, 'accepted', NOW())
      ON CONFLICT (bounty_id, user_id) DO UPDATE SET status = 'accepted';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for pitch acceptance
DROP TRIGGER IF EXISTS on_pitch_accepted ON pitches;
CREATE TRIGGER on_pitch_accepted
  BEFORE UPDATE ON pitches
  FOR EACH ROW
  EXECUTE FUNCTION handle_pitch_acceptance();

-- Function to expire old pitches
CREATE OR REPLACE FUNCTION expire_old_pitches()
RETURNS void AS $$
BEGIN
  UPDATE pitches
  SET status = 'expired'
  WHERE status = 'pending'
  AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
