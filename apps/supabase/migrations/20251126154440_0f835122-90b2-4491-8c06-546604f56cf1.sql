-- Add status and disconnected_at columns to social_account_campaigns
ALTER TABLE public.social_account_campaigns
ADD COLUMN status text NOT NULL DEFAULT 'active',
ADD COLUMN disconnected_at timestamp with time zone;

-- Set all existing records to active status
UPDATE public.social_account_campaigns
SET status = 'active'
WHERE status IS NULL;

-- Add index for better query performance
CREATE INDEX idx_social_account_campaigns_status ON public.social_account_campaigns(status);

-- Add check constraint for valid status values
ALTER TABLE public.social_account_campaigns
ADD CONSTRAINT social_account_campaigns_status_check 
CHECK (status IN ('active', 'disconnected', 'paused'));