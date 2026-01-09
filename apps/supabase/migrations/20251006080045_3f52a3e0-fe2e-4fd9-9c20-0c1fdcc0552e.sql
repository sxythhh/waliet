-- Add analytics_url column to campaigns table
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS analytics_url TEXT;