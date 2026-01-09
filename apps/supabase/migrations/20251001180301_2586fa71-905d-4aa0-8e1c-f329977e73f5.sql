-- Add platform selection and application questions to campaigns table
ALTER TABLE public.campaigns 
ADD COLUMN allowed_platforms text[] DEFAULT ARRAY['tiktok', 'instagram'],
ADD COLUMN application_questions jsonb DEFAULT '[]'::jsonb;

-- Add check constraint to limit platforms
ALTER TABLE public.campaigns
ADD CONSTRAINT check_allowed_platforms CHECK (
  allowed_platforms <@ ARRAY['tiktok', 'instagram']::text[]
);

-- Add check constraint to limit application questions to 3
ALTER TABLE public.campaigns
ADD CONSTRAINT check_application_questions_count CHECK (
  jsonb_array_length(application_questions) <= 3
);