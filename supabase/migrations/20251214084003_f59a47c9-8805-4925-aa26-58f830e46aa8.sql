-- Add section_order column to blueprints table to persist section ordering
ALTER TABLE public.blueprints
ADD COLUMN section_order text[] DEFAULT ARRAY['content', 'platforms', 'brand_voice', 'hooks', 'talking_points', 'dos_and_donts', 'call_to_action', 'hashtags', 'assets', 'example_videos', 'target_personas'];