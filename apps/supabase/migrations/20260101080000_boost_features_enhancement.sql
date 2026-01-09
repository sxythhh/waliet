-- Migration: boost_features_enhancement
-- Description: Add support for pause/resume, waitlist, and creator notes features

-- 1. Add auto_waitlisted_from_pause column to bounty_applications
-- This tracks which applications were automatically moved to waitlist when a boost was paused
ALTER TABLE bounty_applications ADD COLUMN IF NOT EXISTS auto_waitlisted_from_pause BOOLEAN DEFAULT false;

-- 2. Add waitlist_position column to bounty_applications
ALTER TABLE bounty_applications ADD COLUMN IF NOT EXISTS waitlist_position INTEGER;

-- 3. Add paused_at column to bounty_campaigns (optional, for tracking pause time)
ALTER TABLE bounty_campaigns ADD COLUMN IF NOT EXISTS paused_at TIMESTAMPTZ;

-- 4. Add waitlist settings to bounty_campaigns
ALTER TABLE bounty_campaigns ADD COLUMN IF NOT EXISTS waitlist_enabled BOOLEAN DEFAULT true;
ALTER TABLE bounty_campaigns ADD COLUMN IF NOT EXISTS max_waitlist_size INTEGER DEFAULT 50;

-- 5. Create brand_creator_notes table for CRM-style notes
CREATE TABLE IF NOT EXISTS brand_creator_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE NOT NULL,
  creator_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  note_content TEXT CHECK (char_length(note_content) <= 1000),
  tags TEXT[],
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(brand_id, creator_id)
);

-- 6. Enable RLS on brand_creator_notes
ALTER TABLE brand_creator_notes ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS policies for brand_creator_notes
-- Brand members can view their brand's notes
CREATE POLICY "Brand members can view their brand's notes"
  ON brand_creator_notes FOR SELECT
  USING (brand_id IN (SELECT brand_id FROM brand_members WHERE user_id = auth.uid()));

-- Brand members can insert notes for their brand
CREATE POLICY "Brand members can insert notes for their brand"
  ON brand_creator_notes FOR INSERT
  WITH CHECK (brand_id IN (SELECT brand_id FROM brand_members WHERE user_id = auth.uid()));

-- Brand members can update their brand's notes
CREATE POLICY "Brand members can update their brand's notes"
  ON brand_creator_notes FOR UPDATE
  USING (brand_id IN (SELECT brand_id FROM brand_members WHERE user_id = auth.uid()));

-- Brand members can delete their brand's notes
CREATE POLICY "Brand members can delete their brand's notes"
  ON brand_creator_notes FOR DELETE
  USING (brand_id IN (SELECT brand_id FROM brand_members WHERE user_id = auth.uid()));

-- 8. Create index for faster tag filtering
CREATE INDEX IF NOT EXISTS idx_brand_creator_notes_brand_id ON brand_creator_notes(brand_id);
CREATE INDEX IF NOT EXISTS idx_brand_creator_notes_creator_id ON brand_creator_notes(creator_id);
CREATE INDEX IF NOT EXISTS idx_brand_creator_notes_tags ON brand_creator_notes USING GIN(tags);

-- 9. Create index for waitlist ordering
CREATE INDEX IF NOT EXISTS idx_bounty_applications_waitlist ON bounty_applications(bounty_campaign_id, waitlist_position) WHERE status = 'waitlisted';
