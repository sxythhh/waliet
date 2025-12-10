
-- Add more fields to blueprints table
ALTER TABLE public.blueprints
ADD COLUMN IF NOT EXISTS hooks JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS content_guidelines TEXT,
ADD COLUMN IF NOT EXISTS dos_and_donts JSONB DEFAULT '{"dos": [], "donts": []}'::jsonb,
ADD COLUMN IF NOT EXISTS call_to_action TEXT,
ADD COLUMN IF NOT EXISTS hashtags TEXT[] DEFAULT ARRAY[]::text[],
ADD COLUMN IF NOT EXISTS example_videos JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS talking_points JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS brand_voice TEXT;
