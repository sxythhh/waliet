-- Create demographics-videos bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'demographics-videos',
  'demographics-videos',
  true,
  52428800,  -- 50MB limit
  ARRAY['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/x-matroska', 'video/x-m4v']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/x-matroska', 'video/x-m4v'];

-- RLS policy: Public read access (bucket is public)
DROP POLICY IF EXISTS "Public read access" ON storage.objects;
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'demographics-videos');

-- RLS policy: Authenticated users can upload
DROP POLICY IF EXISTS "Authenticated users can upload demographics" ON storage.objects;
CREATE POLICY "Authenticated users can upload demographics"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'demographics-videos');

-- RLS policy: Users can delete their own files (path starts with their user id)
DROP POLICY IF EXISTS "Users can delete own demographics files" ON storage.objects;
CREATE POLICY "Users can delete own demographics files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'demographics-videos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
