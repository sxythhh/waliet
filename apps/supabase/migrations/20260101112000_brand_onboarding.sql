-- Add onboarding tracking fields to brands table
ALTER TABLE public.brands
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN public.brands.onboarding_completed IS 'Whether the brand has completed the onboarding wizard';
COMMENT ON COLUMN public.brands.onboarding_step IS 'Current step in the onboarding wizard (0-4)';
