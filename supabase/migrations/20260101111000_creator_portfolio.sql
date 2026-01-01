-- Add portfolio fields to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS resume_url TEXT,
ADD COLUMN IF NOT EXISTS portfolio_items JSONB DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.resume_url IS 'URL to the creator resume/CV PDF';
COMMENT ON COLUMN public.profiles.portfolio_items IS 'Array of portfolio items: {id, type, url, title, description, order_index}';

-- Create portfolios storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('portfolios', 'portfolios', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for portfolios bucket
CREATE POLICY "Users can upload their own portfolio files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'portfolios' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own portfolio files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'portfolios' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own portfolio files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'portfolios' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Portfolio files are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'portfolios');
