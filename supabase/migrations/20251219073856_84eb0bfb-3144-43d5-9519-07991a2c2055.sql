-- Add file_url column for uploaded videos
ALTER TABLE public.scope_videos ADD COLUMN IF NOT EXISTS file_url text;

-- Create storage bucket for scope videos
INSERT INTO storage.buckets (id, name, public)
VALUES ('scope-videos', 'scope-videos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to scope-videos bucket
CREATE POLICY "Authenticated users can upload scope videos"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'scope-videos' AND auth.role() = 'authenticated');

-- Allow public read access to scope videos
CREATE POLICY "Public can view scope videos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'scope-videos');

-- Allow authenticated users to delete their scope videos
CREATE POLICY "Authenticated users can delete scope videos"
ON storage.objects
FOR DELETE
USING (bucket_id = 'scope-videos' AND auth.role() = 'authenticated');