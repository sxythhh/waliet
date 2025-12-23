-- Add comprehensive boost options to bounty_campaigns
ALTER TABLE public.bounty_campaigns 
ADD COLUMN position_type text DEFAULT NULL,
ADD COLUMN availability_requirement text DEFAULT NULL,
ADD COLUMN work_location text DEFAULT NULL;