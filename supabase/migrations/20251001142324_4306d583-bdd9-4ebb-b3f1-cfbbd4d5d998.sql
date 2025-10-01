-- Create storage bucket for campaign banners
INSERT INTO storage.buckets (id, name, public)
VALUES ('campaign-banners', 'campaign-banners', true);

-- Create RLS policies for campaign banners
CREATE POLICY "Anyone can view campaign banners"
ON storage.objects FOR SELECT
USING (bucket_id = 'campaign-banners');

CREATE POLICY "Authenticated users can upload campaign banners"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'campaign-banners' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Authenticated users can update campaign banners"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'campaign-banners' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Authenticated users can delete campaign banners"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'campaign-banners' 
  AND auth.uid() IS NOT NULL
);

-- Add banner_url column to campaigns table
ALTER TABLE public.campaigns
ADD COLUMN banner_url TEXT;