-- Creator skill types taxonomy for faceless creators
-- This creates a structured taxonomy that differentiates editors, clippers, and repurposers

CREATE TABLE IF NOT EXISTS creator_skill_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL CHECK (category IN ('editor', 'clipper', 'repurposer', 'hybrid')),
  description TEXT,
  icon TEXT, -- Optional icon identifier for UI
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for category-based lookups
CREATE INDEX idx_skill_types_category ON creator_skill_types(category) WHERE is_active = true;
CREATE INDEX idx_skill_types_sort ON creator_skill_types(sort_order) WHERE is_active = true;

-- Seed initial skill types for faceless creators
INSERT INTO creator_skill_types (name, category, description, sort_order) VALUES
  ('Short-form Editor', 'editor', 'Creates original short-form video content from raw footage for TikTok, Reels, and Shorts', 1),
  ('Long-form Clipper', 'clipper', 'Extracts and edits highlights from long-form YouTube or streaming content', 2),
  ('Podcast Clipper', 'clipper', 'Specializes in podcast highlight extraction with captions and visual hooks', 3),
  ('Content Repurposer', 'repurposer', 'Adapts content across platforms (YouTube to TikTok, horizontal to vertical, etc)', 4),
  ('Faceless UGC Editor', 'editor', 'Creates faceless UGC content like product demos, tutorials, and unboxings', 5),
  ('Motion Graphics Editor', 'editor', 'Specializes in animated/motion graphics content and visual effects', 6),
  ('Talking Head Editor', 'editor', 'Edits talking head content with graphics overlays, b-roll, and captions', 7),
  ('Compilation Editor', 'hybrid', 'Creates compilation videos from multiple source clips', 8);

-- Enable RLS
ALTER TABLE creator_skill_types ENABLE ROW LEVEL SECURITY;

-- Allow public read access (skill types are reference data)
CREATE POLICY "Anyone can view active skill types"
  ON creator_skill_types
  FOR SELECT
  USING (is_active = true);

-- Only admins can modify skill types
CREATE POLICY "Only admins can modify skill types"
  ON creator_skill_types
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_skill_types_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER skill_types_updated_at
  BEFORE UPDATE ON creator_skill_types
  FOR EACH ROW
  EXECUTE FUNCTION update_skill_types_updated_at();

COMMENT ON TABLE creator_skill_types IS 'Taxonomy of creator skill types for faceless content creators (editors, clippers, repurposers)';
COMMENT ON COLUMN creator_skill_types.category IS 'High-level category: editor, clipper, repurposer, or hybrid';
