-- Add collection_id and collection_name to brands table
ALTER TABLE public.brands
ADD COLUMN IF NOT EXISTS collection_id text,
ADD COLUMN IF NOT EXISTS collection_name text;