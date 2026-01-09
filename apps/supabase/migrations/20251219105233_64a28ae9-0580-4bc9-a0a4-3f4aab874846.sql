-- Add social media and link fields to brands table
ALTER TABLE public.brands 
ADD COLUMN IF NOT EXISTS instagram_handle text,
ADD COLUMN IF NOT EXISTS linkedin_handle text,
ADD COLUMN IF NOT EXISTS tiktok_handle text,
ADD COLUMN IF NOT EXISTS website_url text,
ADD COLUMN IF NOT EXISTS app_store_url text;