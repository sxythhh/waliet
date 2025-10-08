-- Create storage bucket for brand application logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('brand-application-logos', 'brand-application-logos', true);

-- Allow anyone to upload brand application logos
CREATE POLICY "Anyone can upload brand application logos"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'brand-application-logos');

-- Allow public access to view logos
CREATE POLICY "Brand application logos are publicly accessible"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'brand-application-logos');

-- Allow users to update their uploaded logos
CREATE POLICY "Anyone can update brand application logos"
ON storage.objects
FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'brand-application-logos');

-- Allow users to delete their uploaded logos
CREATE POLICY "Anyone can delete brand application logos"
ON storage.objects
FOR DELETE
TO anon, authenticated
USING (bucket_id = 'brand-application-logos');

-- Add logo_url column to brand_applications table
ALTER TABLE public.brand_applications
ADD COLUMN logo_url TEXT;