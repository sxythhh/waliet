-- Add video_url column to content_styles table
ALTER TABLE content_styles
ADD COLUMN video_url text;

-- Create storage bucket for content videos if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('content-videos', 'content-videos', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for content-videos bucket
CREATE POLICY "Brand members can upload content videos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'content-videos' AND
  (
    EXISTS (
      SELECT 1 FROM brand_members
      WHERE brand_members.user_id = auth.uid()
    ) OR
    has_role(auth.uid(), 'admin'::app_role)
  )
);

CREATE POLICY "Anyone can view content videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'content-videos');

CREATE POLICY "Brand members can delete content videos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'content-videos' AND
  (
    EXISTS (
      SELECT 1 FROM brand_members
      WHERE brand_members.user_id = auth.uid()
    ) OR
    has_role(auth.uid(), 'admin'::app_role)
  )
);