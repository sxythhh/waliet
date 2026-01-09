-- Add blueprint_id column to campaigns table
ALTER TABLE public.campaigns 
ADD COLUMN blueprint_id uuid REFERENCES public.blueprints(id);

-- Create index for better query performance
CREATE INDEX idx_campaigns_blueprint_id ON public.campaigns(blueprint_id);