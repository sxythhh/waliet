-- Add payout_day_of_week to campaigns (0=Sunday, 1=Monday, ..., 6=Saturday)
-- Default to 2 (Tuesday) to match current hardcoded behavior
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS payout_day_of_week integer DEFAULT 2;

-- Add comment for documentation
COMMENT ON COLUMN campaigns.payout_day_of_week IS 'Day of week for payouts: 0=Sunday, 1=Monday, 2=Tuesday (default), 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday';