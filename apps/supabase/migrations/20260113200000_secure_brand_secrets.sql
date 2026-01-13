-- Migration: Move sensitive API keys from brands to secure brand_secrets table
-- This fixes a critical security vulnerability where API keys were publicly readable
-- Note: discord_access_token, discord_refresh_token, discord_token_expires_at are deprecated
-- and just dropped (not migrated) since they're only being cleared, never read

-- 1. Create secure brand_secrets table
CREATE TABLE IF NOT EXISTS brand_secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  shortimize_api_key TEXT,
  dub_api_key TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(brand_id)
);

-- 2. Enable RLS with STRICT policies - only brand admins can access
ALTER TABLE brand_secrets ENABLE ROW LEVEL SECURITY;

-- Policy: Brand admins can read their own secrets
CREATE POLICY "Brand admins can read secrets"
  ON brand_secrets
  FOR SELECT
  USING (is_brand_admin(auth.uid(), brand_id));

-- Policy: Brand admins can insert secrets for their brands
CREATE POLICY "Brand admins can insert secrets"
  ON brand_secrets
  FOR INSERT
  WITH CHECK (is_brand_admin(auth.uid(), brand_id));

-- Policy: Brand admins can update their own secrets
CREATE POLICY "Brand admins can update secrets"
  ON brand_secrets
  FOR UPDATE
  USING (is_brand_admin(auth.uid(), brand_id));

-- Policy: Brand admins can delete their own secrets
CREATE POLICY "Brand admins can delete secrets"
  ON brand_secrets
  FOR DELETE
  USING (is_brand_admin(auth.uid(), brand_id));

-- 3. Migrate existing data from brands to brand_secrets
INSERT INTO brand_secrets (brand_id, shortimize_api_key, dub_api_key)
SELECT
  id,
  shortimize_api_key,
  dub_api_key
FROM brands
WHERE shortimize_api_key IS NOT NULL
   OR dub_api_key IS NOT NULL
ON CONFLICT (brand_id) DO UPDATE SET
  shortimize_api_key = EXCLUDED.shortimize_api_key,
  dub_api_key = EXCLUDED.dub_api_key;

-- 4. Drop sensitive columns from brands table
ALTER TABLE brands
  DROP COLUMN IF EXISTS shortimize_api_key,
  DROP COLUMN IF EXISTS dub_api_key;

-- 5. Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_brand_secrets_brand_id ON brand_secrets(brand_id);

-- 6. Add updated_at trigger
CREATE OR REPLACE FUNCTION update_brand_secrets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS brand_secrets_updated_at ON brand_secrets;
CREATE TRIGGER brand_secrets_updated_at
  BEFORE UPDATE ON brand_secrets
  FOR EACH ROW
  EXECUTE FUNCTION update_brand_secrets_updated_at();

-- 7. Add comment for documentation
COMMENT ON TABLE brand_secrets IS 'Secure storage for brand API keys and tokens. Access restricted to brand admins only via RLS.';
