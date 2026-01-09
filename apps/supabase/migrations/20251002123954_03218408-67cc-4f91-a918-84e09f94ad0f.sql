-- Add preview_url column to campaigns table
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS preview_url text;