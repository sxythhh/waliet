-- Add is_verified column to brands table
ALTER TABLE public.brands ADD COLUMN is_verified boolean NOT NULL DEFAULT false;