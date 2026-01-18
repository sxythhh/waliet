-- Brand Assets System Migration
-- Native asset management for brands to share materials with creators

-- Asset type enum
DO $$ BEGIN
  CREATE TYPE asset_type AS ENUM ('image', 'video', 'document', 'link');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Request priority enum
DO $$ BEGIN
  CREATE TYPE asset_request_priority AS ENUM ('low', 'normal', 'high');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Request status enum
DO $$ BEGIN
  CREATE TYPE asset_request_status AS ENUM ('pending', 'in_progress', 'completed', 'declined');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Main assets table
CREATE TABLE IF NOT EXISTS brand_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,

  -- Core fields
  name TEXT NOT NULL,
  description TEXT,
  type asset_type NOT NULL,

  -- Storage (for uploaded files)
  file_path TEXT,              -- Supabase storage path
  file_url TEXT,               -- Public CDN URL
  file_size BIGINT,            -- Size in bytes
  mime_type TEXT,

  -- External links (for type='link')
  external_url TEXT,

  -- Thumbnail (auto-generated or custom)
  thumbnail_url TEXT,

  -- Metadata
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',

  -- Tracking
  download_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Download/view tracking table
CREATE TABLE IF NOT EXISTS asset_downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES brand_assets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  downloaded_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

-- Asset requests from creators
CREATE TABLE IF NOT EXISTS asset_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES auth.users(id),

  -- Request details
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  asset_type asset_type,
  priority asset_request_priority DEFAULT 'normal',

  -- Status tracking
  status asset_request_status DEFAULT 'pending',
  response_note TEXT,
  fulfilled_asset_id UUID REFERENCES brand_assets(id),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id)
);

-- Indexes for brand_assets
CREATE INDEX IF NOT EXISTS idx_brand_assets_brand_id ON brand_assets(brand_id);
CREATE INDEX IF NOT EXISTS idx_brand_assets_type ON brand_assets(type);
CREATE INDEX IF NOT EXISTS idx_brand_assets_created_at ON brand_assets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_brand_assets_name ON brand_assets(name);

-- Indexes for asset_downloads
CREATE INDEX IF NOT EXISTS idx_asset_downloads_asset_id ON asset_downloads(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_downloads_user_id ON asset_downloads(user_id);
CREATE INDEX IF NOT EXISTS idx_asset_downloads_downloaded_at ON asset_downloads(downloaded_at DESC);

-- Indexes for asset_requests
CREATE INDEX IF NOT EXISTS idx_asset_requests_brand_id ON asset_requests(brand_id);
CREATE INDEX IF NOT EXISTS idx_asset_requests_requested_by ON asset_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_asset_requests_status ON asset_requests(status);
CREATE INDEX IF NOT EXISTS idx_asset_requests_created_at ON asset_requests(created_at DESC);

-- Enable RLS on all tables
ALTER TABLE brand_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_requests ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- RLS Policies for brand_assets
-- ==========================================

-- Brand members can view assets for their brands
CREATE POLICY "Brand members can view assets"
  ON brand_assets
  FOR SELECT
  USING (
    brand_id IN (
      SELECT brand_id FROM brand_members WHERE user_id = auth.uid()
    )
  );

-- Brand admins/owners can insert assets
CREATE POLICY "Brand admins can insert assets"
  ON brand_assets
  FOR INSERT
  WITH CHECK (
    brand_id IN (
      SELECT brand_id FROM brand_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Brand admins/owners can update assets
CREATE POLICY "Brand admins can update assets"
  ON brand_assets
  FOR UPDATE
  USING (
    brand_id IN (
      SELECT brand_id FROM brand_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Brand admins/owners can delete assets
CREATE POLICY "Brand admins can delete assets"
  ON brand_assets
  FOR DELETE
  USING (
    brand_id IN (
      SELECT brand_id FROM brand_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Platform admins can manage all assets
CREATE POLICY "Platform admins can manage all assets"
  ON brand_assets
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- ==========================================
-- RLS Policies for asset_downloads
-- ==========================================

-- Anyone authenticated can insert download records
CREATE POLICY "Authenticated users can log downloads"
  ON asset_downloads
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Brand admins can view download logs for their brand's assets
CREATE POLICY "Brand admins can view download logs"
  ON asset_downloads
  FOR SELECT
  USING (
    asset_id IN (
      SELECT ba.id FROM brand_assets ba
      JOIN brand_members bm ON ba.brand_id = bm.brand_id
      WHERE bm.user_id = auth.uid() AND bm.role IN ('owner', 'admin')
    )
  );

-- Users can view their own download history
CREATE POLICY "Users can view own download history"
  ON asset_downloads
  FOR SELECT
  USING (user_id = auth.uid());

-- Platform admins can view all download logs
CREATE POLICY "Platform admins can view all download logs"
  ON asset_downloads
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- ==========================================
-- RLS Policies for asset_requests
-- ==========================================

-- Brand members can create requests for their brands
CREATE POLICY "Brand members can create requests"
  ON asset_requests
  FOR INSERT
  WITH CHECK (
    brand_id IN (
      SELECT brand_id FROM brand_members WHERE user_id = auth.uid()
    )
    AND requested_by = auth.uid()
  );

-- Users can view their own requests
CREATE POLICY "Users can view own requests"
  ON asset_requests
  FOR SELECT
  USING (requested_by = auth.uid());

-- Brand admins can view all requests for their brands
CREATE POLICY "Brand admins can view brand requests"
  ON asset_requests
  FOR SELECT
  USING (
    brand_id IN (
      SELECT brand_id FROM brand_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Brand admins can update request status
CREATE POLICY "Brand admins can update requests"
  ON asset_requests
  FOR UPDATE
  USING (
    brand_id IN (
      SELECT brand_id FROM brand_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Platform admins can manage all requests
CREATE POLICY "Platform admins can manage all requests"
  ON asset_requests
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- ==========================================
-- Updated_at triggers
-- ==========================================

-- Create generic updated_at function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for brand_assets
DROP TRIGGER IF EXISTS brand_assets_updated_at ON brand_assets;
CREATE TRIGGER brand_assets_updated_at
  BEFORE UPDATE ON brand_assets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for asset_requests
DROP TRIGGER IF EXISTS asset_requests_updated_at ON asset_requests;
CREATE TRIGGER asset_requests_updated_at
  BEFORE UPDATE ON asset_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- Storage bucket for brand assets
-- ==========================================

-- Create storage bucket (if using Supabase storage)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'brand-assets',
  'brand-assets',
  true,
  314572800, -- 300MB limit
  ARRAY[
    'image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/svg+xml',
    'video/mp4', 'video/quicktime', 'video/webm',
    'application/pdf',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain', 'text/markdown'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage policies for brand-assets bucket

-- Brand admins can upload to their brand folder
CREATE POLICY "Brand admins can upload assets"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'brand-assets' AND
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM brands
      WHERE id IN (
        SELECT brand_id FROM brand_members
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
      )
    )
  );

-- Brand admins can update their brand's assets
CREATE POLICY "Brand admins can update assets storage"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'brand-assets' AND
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM brands
      WHERE id IN (
        SELECT brand_id FROM brand_members
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
      )
    )
  );

-- Brand admins can delete their brand's assets
CREATE POLICY "Brand admins can delete assets storage"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'brand-assets' AND
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM brands
      WHERE id IN (
        SELECT brand_id FROM brand_members
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
      )
    )
  );

-- Public read access (bucket is public)
CREATE POLICY "Anyone can view brand assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'brand-assets');

-- ==========================================
-- Comments
-- ==========================================

COMMENT ON TABLE brand_assets IS 'Brand assets library - logos, videos, documents, and links for creators';
COMMENT ON TABLE asset_downloads IS 'Tracking table for asset download analytics';
COMMENT ON TABLE asset_requests IS 'Creator requests for specific brand assets';

COMMENT ON COLUMN brand_assets.type IS 'Asset category: image, video, document, or link';
COMMENT ON COLUMN brand_assets.file_path IS 'Path in Supabase storage bucket';
COMMENT ON COLUMN brand_assets.file_url IS 'Public CDN URL for the asset';
COMMENT ON COLUMN brand_assets.external_url IS 'URL for link-type assets';
COMMENT ON COLUMN brand_assets.download_count IS 'Total number of downloads (denormalized for performance)';

COMMENT ON COLUMN asset_requests.priority IS 'Request urgency: low, normal, or high';
COMMENT ON COLUMN asset_requests.status IS 'Request state: pending, in_progress, completed, or declined';
COMMENT ON COLUMN asset_requests.fulfilled_asset_id IS 'Reference to the asset created to fulfill this request';
