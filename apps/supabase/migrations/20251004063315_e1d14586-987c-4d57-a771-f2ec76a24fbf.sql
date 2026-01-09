-- Create RLS policy for users to view their own verification screenshots
CREATE POLICY "Users can view own verification screenshots"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'verification-screenshots' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);