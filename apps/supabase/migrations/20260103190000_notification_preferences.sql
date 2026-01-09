-- Add notification preference columns to profiles table
-- Allows creators to manage their email and Discord notification preferences

-- Email notification preferences
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS notify_email_new_campaigns BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_email_transactions BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_email_weekly_roundup BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_email_campaign_updates BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_email_payout_status BOOLEAN NOT NULL DEFAULT true;

-- Discord notification preferences
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS notify_discord_new_campaigns BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_discord_transactions BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_discord_campaign_updates BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_discord_payout_status BOOLEAN NOT NULL DEFAULT true;

-- Add comments for documentation
COMMENT ON COLUMN public.profiles.notify_email_new_campaigns IS 'Receive email notifications for new campaign opportunities';
COMMENT ON COLUMN public.profiles.notify_email_transactions IS 'Receive email notifications for wallet transactions';
COMMENT ON COLUMN public.profiles.notify_email_weekly_roundup IS 'Receive weekly summary email of activity';
COMMENT ON COLUMN public.profiles.notify_email_campaign_updates IS 'Receive email notifications for campaign status changes';
COMMENT ON COLUMN public.profiles.notify_email_payout_status IS 'Receive email notifications for payout status updates';
COMMENT ON COLUMN public.profiles.notify_discord_new_campaigns IS 'Receive Discord DMs for new campaign opportunities';
COMMENT ON COLUMN public.profiles.notify_discord_transactions IS 'Receive Discord DMs for wallet transactions';
COMMENT ON COLUMN public.profiles.notify_discord_campaign_updates IS 'Receive Discord DMs for campaign status changes';
COMMENT ON COLUMN public.profiles.notify_discord_payout_status IS 'Receive Discord DMs for payout status updates';
