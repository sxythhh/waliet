-- Create video analytics table for storing imported video data
CREATE TABLE IF NOT EXISTS public.video_analytics (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id uuid NOT NULL,
  account text NOT NULL,
  platform text NOT NULL,
  video_link text NOT NULL,
  video_title text,
  views integer DEFAULT 0,
  likes integer DEFAULT 0,
  comments integer DEFAULT 0,
  engagement_rate numeric,
  views_performance numeric,
  upload_date date,
  imported_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.video_analytics ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Brand members can view their brand's video analytics"
  ON public.video_analytics
  FOR SELECT
  USING (is_brand_member(auth.uid(), brand_id) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Brand admins can insert video analytics"
  ON public.video_analytics
  FOR INSERT
  WITH CHECK (is_brand_admin(auth.uid(), brand_id) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Brand admins can update video analytics"
  ON public.video_analytics
  FOR UPDATE
  USING (is_brand_admin(auth.uid(), brand_id) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Brand admins can delete video analytics"
  ON public.video_analytics
  FOR DELETE
  USING (is_brand_admin(auth.uid(), brand_id) OR has_role(auth.uid(), 'admin'::app_role));

-- Create index for better performance
CREATE INDEX idx_video_analytics_brand_id ON public.video_analytics(brand_id);
CREATE INDEX idx_video_analytics_upload_date ON public.video_analytics(upload_date DESC);