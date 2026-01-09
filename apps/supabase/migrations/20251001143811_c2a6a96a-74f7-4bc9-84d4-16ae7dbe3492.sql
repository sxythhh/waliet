-- Add brand_type column to brands table
ALTER TABLE public.brands
ADD COLUMN brand_type TEXT CHECK (brand_type IN ('Lead', 'DWY', 'Client'));

-- Set a default value for existing brands
UPDATE public.brands
SET brand_type = 'Client'
WHERE brand_type IS NULL;