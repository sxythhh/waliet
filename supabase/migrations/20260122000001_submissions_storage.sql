-- Create storage bucket for task submission screenshots
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'submissions',
  'submissions',
  true,
  10485760, -- 10MB
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for submissions bucket

-- Users can upload their own screenshots
CREATE POLICY "Users can upload submission screenshots"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'submissions' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can view their own screenshots
CREATE POLICY "Users can view own submission screenshots"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'submissions' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Business members can view screenshots for their tasks
CREATE POLICY "Business members can view task submission screenshots"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'submissions' AND
  EXISTS (
    SELECT 1 FROM task_submissions ts
    JOIN tasks t ON t.id = ts.task_id
    JOIN business_members bm ON bm.business_id = t.business_id
    WHERE ts.screenshot_url LIKE '%' || name
    AND bm.user_id = auth.uid()
  )
);

-- Public can view screenshots (for review queue display)
CREATE POLICY "Public can view submission screenshots"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'submissions');
