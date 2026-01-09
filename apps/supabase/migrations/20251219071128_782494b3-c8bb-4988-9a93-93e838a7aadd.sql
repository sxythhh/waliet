-- Create scope_videos table for the video library
CREATE TABLE public.scope_videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  platform TEXT NOT NULL DEFAULT 'tiktok',
  username TEXT,
  avatar_url TEXT,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  views INTEGER DEFAULT 0,
  caption TEXT,
  tags TEXT[] DEFAULT '{}',
  is_example BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create scope_video_saves table to track which videos are saved to which blueprints
CREATE TABLE public.scope_video_saves (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scope_video_id UUID NOT NULL REFERENCES public.scope_videos(id) ON DELETE CASCADE,
  blueprint_id UUID NOT NULL REFERENCES public.blueprints(id) ON DELETE CASCADE,
  saved_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(scope_video_id, blueprint_id)
);

-- Enable RLS
ALTER TABLE public.scope_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scope_video_saves ENABLE ROW LEVEL SECURITY;

-- RLS policies for scope_videos - brand members can manage their brand's videos
CREATE POLICY "Brand members can view scope videos"
ON public.scope_videos
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.brand_members
    WHERE brand_members.brand_id = scope_videos.brand_id
    AND brand_members.user_id = auth.uid()
  )
);

CREATE POLICY "Brand members can insert scope videos"
ON public.scope_videos
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.brand_members
    WHERE brand_members.brand_id = scope_videos.brand_id
    AND brand_members.user_id = auth.uid()
  )
);

CREATE POLICY "Brand members can update scope videos"
ON public.scope_videos
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.brand_members
    WHERE brand_members.brand_id = scope_videos.brand_id
    AND brand_members.user_id = auth.uid()
  )
);

CREATE POLICY "Brand members can delete scope videos"
ON public.scope_videos
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.brand_members
    WHERE brand_members.brand_id = scope_videos.brand_id
    AND brand_members.user_id = auth.uid()
  )
);

-- RLS policies for scope_video_saves
CREATE POLICY "Brand members can view scope video saves"
ON public.scope_video_saves
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.scope_videos sv
    JOIN public.brand_members bm ON bm.brand_id = sv.brand_id
    WHERE sv.id = scope_video_saves.scope_video_id
    AND bm.user_id = auth.uid()
  )
);

CREATE POLICY "Brand members can insert scope video saves"
ON public.scope_video_saves
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.scope_videos sv
    JOIN public.brand_members bm ON bm.brand_id = sv.brand_id
    WHERE sv.id = scope_video_saves.scope_video_id
    AND bm.user_id = auth.uid()
  )
);

CREATE POLICY "Brand members can delete scope video saves"
ON public.scope_video_saves
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.scope_videos sv
    JOIN public.brand_members bm ON bm.brand_id = sv.brand_id
    WHERE sv.id = scope_video_saves.scope_video_id
    AND bm.user_id = auth.uid()
  )
);

-- Create indexes for performance
CREATE INDEX idx_scope_videos_brand_id ON public.scope_videos(brand_id);
CREATE INDEX idx_scope_videos_platform ON public.scope_videos(platform);
CREATE INDEX idx_scope_videos_is_example ON public.scope_videos(is_example);
CREATE INDEX idx_scope_video_saves_video ON public.scope_video_saves(scope_video_id);
CREATE INDEX idx_scope_video_saves_blueprint ON public.scope_video_saves(blueprint_id);

-- Add trigger for updated_at
CREATE TRIGGER update_scope_videos_updated_at
BEFORE UPDATE ON public.scope_videos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();