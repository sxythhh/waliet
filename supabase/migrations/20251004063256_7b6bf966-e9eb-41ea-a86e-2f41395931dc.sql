-- Create RLS policy for admins to view verification screenshots
CREATE POLICY "Admins can view verification screenshots"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'verification-screenshots' 
  AND has_role(auth.uid(), 'admin'::app_role)
);