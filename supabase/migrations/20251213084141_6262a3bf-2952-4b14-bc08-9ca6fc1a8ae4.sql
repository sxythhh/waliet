-- Add is_bookmarked column to conversations table
ALTER TABLE public.conversations ADD COLUMN is_bookmarked boolean NOT NULL DEFAULT false;

-- Create index for faster bookmark filtering
CREATE INDEX idx_conversations_bookmarked ON public.conversations(brand_id, is_bookmarked) WHERE is_bookmarked = true;