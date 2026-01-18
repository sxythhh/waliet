-- Campaign/Boost Announcements
-- Allows brands to post announcements to creators in their campaigns/boosts

-- Create announcements table
CREATE TABLE IF NOT EXISTS campaign_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Can belong to either a campaign or a boost (one must be set)
  campaign_id UUID REFERENCES bounty_campaigns(id) ON DELETE CASCADE,
  boost_id UUID REFERENCES bounty_campaigns(id) ON DELETE CASCADE,

  -- Content
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT FALSE,

  -- Author (brand team member who created it)
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure at least one of campaign_id or boost_id is set
  CONSTRAINT announcement_must_have_source CHECK (
    (campaign_id IS NOT NULL AND boost_id IS NULL) OR
    (campaign_id IS NULL AND boost_id IS NOT NULL)
  )
);

-- Create reactions table
CREATE TABLE IF NOT EXISTS announcement_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID NOT NULL REFERENCES campaign_announcements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Each user can only react once with each emoji per announcement
  UNIQUE(announcement_id, user_id, emoji)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_announcements_campaign ON campaign_announcements(campaign_id) WHERE campaign_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_announcements_boost ON campaign_announcements(boost_id) WHERE boost_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON campaign_announcements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_pinned ON campaign_announcements(is_pinned) WHERE is_pinned = TRUE;
CREATE INDEX IF NOT EXISTS idx_reactions_announcement ON announcement_reactions(announcement_id);
CREATE INDEX IF NOT EXISTS idx_reactions_user ON announcement_reactions(user_id);

-- RLS Policies for campaign_announcements

ALTER TABLE campaign_announcements ENABLE ROW LEVEL SECURITY;

-- Brands can manage announcements for their campaigns/boosts
CREATE POLICY "Brands can create announcements for their sources"
  ON campaign_announcements
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Check campaign ownership
    (campaign_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM bounty_campaigns bc
      JOIN brands b ON bc.brand_id = b.id
      JOIN brand_members bm ON b.id = bm.brand_id
      WHERE bc.id = campaign_id AND bm.user_id = auth.uid()
    ))
    OR
    -- Check boost ownership
    (boost_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM bounty_campaigns bc
      JOIN brands b ON bc.brand_id = b.id
      JOIN brand_members bm ON b.id = bm.brand_id
      WHERE bc.id = boost_id AND bm.user_id = auth.uid()
    ))
  );

CREATE POLICY "Brands can update their announcements"
  ON campaign_announcements
  FOR UPDATE
  TO authenticated
  USING (
    (campaign_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM bounty_campaigns bc
      JOIN brands b ON bc.brand_id = b.id
      JOIN brand_members bm ON b.id = bm.brand_id
      WHERE bc.id = campaign_id AND bm.user_id = auth.uid()
    ))
    OR
    (boost_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM bounty_campaigns bc
      JOIN brands b ON bc.brand_id = b.id
      JOIN brand_members bm ON b.id = bm.brand_id
      WHERE bc.id = boost_id AND bm.user_id = auth.uid()
    ))
  );

CREATE POLICY "Brands can delete their announcements"
  ON campaign_announcements
  FOR DELETE
  TO authenticated
  USING (
    (campaign_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM bounty_campaigns bc
      JOIN brands b ON bc.brand_id = b.id
      JOIN brand_members bm ON b.id = bm.brand_id
      WHERE bc.id = campaign_id AND bm.user_id = auth.uid()
    ))
    OR
    (boost_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM bounty_campaigns bc
      JOIN brands b ON bc.brand_id = b.id
      JOIN brand_members bm ON b.id = bm.brand_id
      WHERE bc.id = boost_id AND bm.user_id = auth.uid()
    ))
  );

-- Creators who are members can read announcements
CREATE POLICY "Members can read announcements"
  ON campaign_announcements
  FOR SELECT
  TO authenticated
  USING (
    -- Campaign members
    (campaign_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM campaign_members cm
      WHERE cm.campaign_id = campaign_announcements.campaign_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'approved'
    ))
    OR
    -- Boost members
    (boost_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM boost_memberships bm
      WHERE bm.boost_id = campaign_announcements.boost_id
      AND bm.user_id = auth.uid()
      AND bm.status = 'active'
    ))
    OR
    -- Brand members can also read
    (campaign_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM bounty_campaigns bc
      JOIN brands b ON bc.brand_id = b.id
      JOIN brand_members bm ON b.id = bm.brand_id
      WHERE bc.id = campaign_id AND bm.user_id = auth.uid()
    ))
    OR
    (boost_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM bounty_campaigns bc
      JOIN brands b ON bc.brand_id = b.id
      JOIN brand_members bm ON b.id = bm.brand_id
      WHERE bc.id = boost_id AND bm.user_id = auth.uid()
    ))
  );

-- RLS Policies for announcement_reactions

ALTER TABLE announcement_reactions ENABLE ROW LEVEL SECURITY;

-- Users can add their own reactions
CREATE POLICY "Users can add reactions"
  ON announcement_reactions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM campaign_announcements ca
      WHERE ca.id = announcement_id
      -- Must be able to read the announcement
      AND (
        (ca.campaign_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM campaign_members cm
          WHERE cm.campaign_id = ca.campaign_id
          AND cm.user_id = auth.uid()
          AND cm.status = 'approved'
        ))
        OR
        (ca.boost_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM boost_memberships bm
          WHERE bm.boost_id = ca.boost_id
          AND bm.user_id = auth.uid()
          AND bm.status = 'active'
        ))
      )
    )
  );

-- Users can remove their own reactions
CREATE POLICY "Users can remove their reactions"
  ON announcement_reactions
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Anyone who can read announcements can see reactions
CREATE POLICY "Members can see reactions"
  ON announcement_reactions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaign_announcements ca
      WHERE ca.id = announcement_id
      AND (
        (ca.campaign_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM campaign_members cm
          WHERE cm.campaign_id = ca.campaign_id
          AND cm.user_id = auth.uid()
          AND cm.status = 'approved'
        ))
        OR
        (ca.boost_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM boost_memberships bm
          WHERE bm.boost_id = ca.boost_id
          AND bm.user_id = auth.uid()
          AND bm.status = 'active'
        ))
        OR
        -- Brand members
        (ca.campaign_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM bounty_campaigns bc
          JOIN brands b ON bc.brand_id = b.id
          JOIN brand_members bm ON b.id = bm.brand_id
          WHERE bc.id = ca.campaign_id AND bm.user_id = auth.uid()
        ))
        OR
        (ca.boost_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM bounty_campaigns bc
          JOIN brands b ON bc.brand_id = b.id
          JOIN brand_members bm ON b.id = bm.brand_id
          WHERE bc.id = ca.boost_id AND bm.user_id = auth.uid()
        ))
      )
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_announcement_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER trigger_update_announcement_timestamp
  BEFORE UPDATE ON campaign_announcements
  FOR EACH ROW
  EXECUTE FUNCTION update_announcement_updated_at();
