-- Create storage bucket for analytics recordings
INSERT INTO storage.buckets (id, name, public)
VALUES ('analytics-recordings', 'analytics-recordings', false)
ON CONFLICT (id) DO NOTHING;

-- Allow creators to upload their own recordings
CREATE POLICY "Creators can upload analytics recordings"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'analytics-recordings' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow creators to view their own recordings
CREATE POLICY "Creators can view own analytics recordings"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'analytics-recordings'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow brand members to view recordings for their brand's submissions
CREATE POLICY "Brand members can view analytics recordings"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'analytics-recordings'
  AND EXISTS (
    SELECT 1 FROM video_submissions vs
    INNER JOIN brand_members bm ON bm.brand_id = vs.brand_id
    WHERE bm.user_id = auth.uid()
    AND vs.id::text = (storage.foldername(name))[2]
  )
);