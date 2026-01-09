-- Add Shortimize API key field to brands table
ALTER TABLE public.brands
ADD COLUMN shortimize_api_key TEXT;

COMMENT ON COLUMN public.brands.shortimize_api_key IS 'Shortimize API key for the brand';