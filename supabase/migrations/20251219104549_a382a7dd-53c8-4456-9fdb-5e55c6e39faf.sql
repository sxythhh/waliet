-- Add notification preference columns to brands table
ALTER TABLE public.brands 
ADD COLUMN IF NOT EXISTS notify_new_application boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_new_sale boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_new_message boolean DEFAULT true;