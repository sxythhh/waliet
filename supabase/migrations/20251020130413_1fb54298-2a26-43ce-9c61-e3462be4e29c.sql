-- Create storage bucket for campaign videos
INSERT INTO storage.buckets (id, name, public)
VALUES ('campaign-videos', 'campaign-videos', true);

-- Create RLS policies for campaign videos bucket
CREATE POLICY "Admins can upload videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'campaign-videos' AND
  (SELECT has_role(auth.uid(), 'admin'::app_role))
);

CREATE POLICY "Admins can update videos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'campaign-videos' AND
  (SELECT has_role(auth.uid(), 'admin'::app_role))
);

CREATE POLICY "Admins can delete videos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'campaign-videos' AND
  (SELECT has_role(auth.uid(), 'admin'::app_role))
);

CREATE POLICY "Videos are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'campaign-videos');

-- Create campaign_videos table
CREATE TABLE public.campaign_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_url TEXT NOT NULL,
  submission_text TEXT,
  bot_score INTEGER,
  estimated_payout NUMERIC(10, 2),
  flag_deadline TIMESTAMP WITH TIME ZONE,
  is_flagged BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.campaign_videos ENABLE ROW LEVEL SECURITY;

-- RLS Policies for campaign_videos
CREATE POLICY "Admins can manage campaign videos"
ON public.campaign_videos
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view campaign videos"
ON public.campaign_videos
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Creators can view their own videos"
ON public.campaign_videos
FOR SELECT
TO authenticated
USING (auth.uid() = creator_id);

-- Add updated_at trigger
CREATE TRIGGER update_campaign_videos_updated_at
  BEFORE UPDATE ON public.campaign_videos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();