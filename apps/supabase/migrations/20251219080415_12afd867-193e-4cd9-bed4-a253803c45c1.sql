-- Make brand_id nullable to allow global scope videos
ALTER TABLE public.scope_videos ALTER COLUMN brand_id DROP NOT NULL;