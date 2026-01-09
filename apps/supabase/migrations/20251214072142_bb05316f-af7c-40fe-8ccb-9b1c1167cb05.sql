-- Add blueprint_id column to bounty_campaigns table
ALTER TABLE public.bounty_campaigns 
ADD COLUMN blueprint_id uuid REFERENCES public.blueprints(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX idx_bounty_campaigns_blueprint_id ON public.bounty_campaigns(blueprint_id);