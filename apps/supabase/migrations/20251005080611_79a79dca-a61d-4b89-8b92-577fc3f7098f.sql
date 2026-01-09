-- Add requires_application column to campaigns table
ALTER TABLE public.campaigns 
ADD COLUMN requires_application BOOLEAN NOT NULL DEFAULT true;

-- Add comment to explain the column
COMMENT ON COLUMN public.campaigns.requires_application IS 'If false, users can join the campaign without submitting an application - they are automatically approved';