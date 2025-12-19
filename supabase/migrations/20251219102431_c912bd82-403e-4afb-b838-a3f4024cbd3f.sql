-- Add manage_url column to brands table
ALTER TABLE public.brands 
ADD COLUMN IF NOT EXISTS whop_manage_url TEXT;