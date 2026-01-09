-- Add dub_api_key column to brands table for Dub.co integration
ALTER TABLE public.brands
ADD COLUMN dub_api_key TEXT;