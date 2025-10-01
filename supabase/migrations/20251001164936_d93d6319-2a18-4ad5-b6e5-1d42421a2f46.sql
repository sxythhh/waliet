-- Create storage bucket for course content images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('course-images', 'course-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for course images
CREATE POLICY "Anyone can view course images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'course-images');

CREATE POLICY "Admins can upload course images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'course-images' 
  AND (SELECT has_role(auth.uid(), 'admin'::app_role))
);

CREATE POLICY "Admins can update course images" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'course-images' 
  AND (SELECT has_role(auth.uid(), 'admin'::app_role))
);

CREATE POLICY "Admins can delete course images" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'course-images' 
  AND (SELECT has_role(auth.uid(), 'admin'::app_role))
);