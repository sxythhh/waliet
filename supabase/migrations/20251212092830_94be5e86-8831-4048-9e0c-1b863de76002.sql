-- Create storage bucket for blueprint videos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'blueprint-videos',
  'blueprint-videos',
  true,
  104857600, -- 100MB limit
  ARRAY['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/x-ms-wmv', 'video/mpeg']
) ON CONFLICT (id) DO NOTHING;

-- Create policies for blueprint videos storage
CREATE POLICY "Anyone can view blueprint videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'blueprint-videos');

CREATE POLICY "Brand members can upload blueprint videos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'blueprint-videos' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Brand members can delete blueprint videos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'blueprint-videos' 
  AND auth.uid() IS NOT NULL
);