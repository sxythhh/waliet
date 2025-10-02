-- Create avatars storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for avatars
CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Add rating columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS trust_score integer DEFAULT 0 CHECK (trust_score >= 0 AND trust_score <= 100),
ADD COLUMN IF NOT EXISTS demographics_score integer DEFAULT 0 CHECK (demographics_score >= 0 AND demographics_score <= 100),
ADD COLUMN IF NOT EXISTS views_score integer DEFAULT 0 CHECK (views_score >= 0 AND views_score <= 100);