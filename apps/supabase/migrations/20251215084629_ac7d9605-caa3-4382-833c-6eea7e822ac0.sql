-- Add webhook columns to brands table for integrations
ALTER TABLE public.brands 
ADD COLUMN IF NOT EXISTS slack_webhook_url text,
ADD COLUMN IF NOT EXISTS discord_webhook_url text;