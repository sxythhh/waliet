-- Add billing address and legal business name fields to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS billing_address text,
ADD COLUMN IF NOT EXISTS legal_business_name text;