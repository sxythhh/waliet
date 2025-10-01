-- Add URL fields to brands table for embedded content
ALTER TABLE public.brands 
ADD COLUMN IF NOT EXISTS assets_url TEXT,
ADD COLUMN IF NOT EXISTS home_url TEXT;