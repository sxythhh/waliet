-- Create table for API rate limiting
CREATE TABLE IF NOT EXISTS api_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_hash TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_api_rate_limits_key_time
  ON api_rate_limits (api_key_hash, created_at DESC);

-- Create index for cleanup
CREATE INDEX IF NOT EXISTS idx_api_rate_limits_created_at
  ON api_rate_limits (created_at);

-- RLS: Only service role can access this table
ALTER TABLE api_rate_limits ENABLE ROW LEVEL SECURITY;

-- No RLS policies needed - service role bypasses RLS
