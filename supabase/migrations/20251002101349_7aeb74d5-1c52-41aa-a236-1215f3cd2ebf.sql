-- Add budget_used column to campaigns table
ALTER TABLE public.campaigns 
ADD COLUMN budget_used numeric DEFAULT 0;