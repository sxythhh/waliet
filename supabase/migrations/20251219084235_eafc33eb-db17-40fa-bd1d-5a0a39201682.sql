-- Add filter columns to scope_videos table
ALTER TABLE public.scope_videos
ADD COLUMN IF NOT EXISTS cta_outcome text,
ADD COLUMN IF NOT EXISTS format text,
ADD COLUMN IF NOT EXISTS content_style text,
ADD COLUMN IF NOT EXISTS target_audience text;

-- Add indexes for better filter performance
CREATE INDEX IF NOT EXISTS idx_scope_videos_cta_outcome ON public.scope_videos(cta_outcome);
CREATE INDEX IF NOT EXISTS idx_scope_videos_format ON public.scope_videos(format);
CREATE INDEX IF NOT EXISTS idx_scope_videos_content_style ON public.scope_videos(content_style);
CREATE INDEX IF NOT EXISTS idx_scope_videos_target_audience ON public.scope_videos(target_audience);
CREATE INDEX IF NOT EXISTS idx_scope_videos_platform ON public.scope_videos(platform);