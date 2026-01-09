-- Add visibility toggle columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS show_total_earned boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS show_location boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS show_joined_campaigns boolean DEFAULT false;