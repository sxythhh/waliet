-- Add brand_color column to brands table
ALTER TABLE public.brands 
ADD COLUMN brand_color TEXT DEFAULT '#8B5CF6';