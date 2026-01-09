-- Add faqs column to blueprints table
ALTER TABLE blueprints ADD COLUMN IF NOT EXISTS faqs JSONB DEFAULT '[]'::jsonb;

-- Create index for FAQs queries
CREATE INDEX IF NOT EXISTS idx_blueprints_faqs ON blueprints USING GIN (faqs);

COMMENT ON COLUMN blueprints.faqs IS 'Array of FAQ objects with question and answer fields';
