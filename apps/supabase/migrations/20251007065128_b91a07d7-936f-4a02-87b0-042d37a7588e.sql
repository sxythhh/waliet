-- Add business details and renewal date to brands table
ALTER TABLE public.brands 
ADD COLUMN business_details jsonb DEFAULT '{}'::jsonb,
ADD COLUMN renewal_date date;

-- Add comment for clarity
COMMENT ON COLUMN public.brands.business_details IS 'Stores legal_name, business_address, and other business-related information';
COMMENT ON COLUMN public.brands.renewal_date IS 'Date when the client paid / contract renewal date';