-- Add columns to social_accounts for account link and verification screenshot
ALTER TABLE social_accounts
ADD COLUMN IF NOT EXISTS account_link TEXT,
ADD COLUMN IF NOT EXISTS verification_screenshot_url TEXT;

-- Create storage bucket for verification screenshots
INSERT INTO storage.buckets (id, name, public)
VALUES ('verification-screenshots', 'verification-screenshots', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for verification screenshots
CREATE POLICY "Users can upload their own verification screenshots"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'verification-screenshots' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own verification screenshots"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'verification-screenshots' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own verification screenshots"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'verification-screenshots' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own verification screenshots"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'verification-screenshots' AND
  auth.uid()::text = (storage.foldername(name))[1]
);