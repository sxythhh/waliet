-- Add platform_rates JSONB column to store per-platform payment configurations
-- Structure: { "tiktok": { "type": "cpm" | "per_post", "cpm_rate": number, "post_rate": number }, ... }
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS platform_rates jsonb DEFAULT NULL;