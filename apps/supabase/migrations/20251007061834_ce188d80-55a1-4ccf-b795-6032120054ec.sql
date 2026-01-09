-- Add is_active column to brands table
ALTER TABLE public.brands 
ADD COLUMN is_active boolean NOT NULL DEFAULT true;

-- Create index for better performance on active status queries
CREATE INDEX idx_brands_is_active ON public.brands(is_active);