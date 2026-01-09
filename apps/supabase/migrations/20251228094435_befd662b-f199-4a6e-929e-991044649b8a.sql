-- Add subscribed_to_updates column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS subscribed_to_updates boolean NOT NULL DEFAULT true;