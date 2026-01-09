-- Drop the existing check constraint on allowed_platforms
ALTER TABLE public.campaigns 
DROP CONSTRAINT IF EXISTS check_allowed_platforms;

-- Add a new check constraint that includes all platforms: tiktok, instagram, youtube, and x
ALTER TABLE public.campaigns
ADD CONSTRAINT check_allowed_platforms 
CHECK (
  allowed_platforms <@ ARRAY['tiktok', 'instagram', 'youtube', 'x']::text[]
  AND allowed_platforms && ARRAY['tiktok', 'instagram', 'youtube', 'x']::text[]
);

-- Add comment to explain the constraint
COMMENT ON CONSTRAINT check_allowed_platforms ON public.campaigns IS 'Ensures allowed_platforms only contains valid platform names: tiktok, instagram, youtube, x';