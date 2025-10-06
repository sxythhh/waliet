-- Add is_featured column to campaigns table
ALTER TABLE public.campaigns
ADD COLUMN is_featured boolean NOT NULL DEFAULT false;