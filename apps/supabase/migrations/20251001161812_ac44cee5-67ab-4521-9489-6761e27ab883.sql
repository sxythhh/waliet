-- Add account_url field to brands table
ALTER TABLE public.brands 
ADD COLUMN IF NOT EXISTS account_url TEXT;