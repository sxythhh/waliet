-- Add training_modules JSONB field to blueprints table
ALTER TABLE public.blueprints
ADD COLUMN IF NOT EXISTS training_modules JSONB DEFAULT '[]'::jsonb;

-- Training module structure:
-- {
--   id: string (uuid),
--   title: string,
--   content: string (rich text),
--   video_url: string | null,
--   quiz: { question: string, options: string[], correct: number }[] | null,
--   order_index: number,
--   required: boolean
-- }

-- Create blueprint_training_completions table
CREATE TABLE IF NOT EXISTS public.blueprint_training_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blueprint_id UUID NOT NULL REFERENCES public.blueprints(id) ON DELETE CASCADE,
  module_id TEXT NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  quiz_score INTEGER,
  UNIQUE(user_id, blueprint_id, module_id)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_blueprint_training_completions_user ON public.blueprint_training_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_blueprint_training_completions_blueprint ON public.blueprint_training_completions(blueprint_id);
CREATE INDEX IF NOT EXISTS idx_blueprints_training_modules ON public.blueprints USING GIN (training_modules);

-- Enable RLS
ALTER TABLE public.blueprint_training_completions ENABLE ROW LEVEL SECURITY;

-- RLS policies for blueprint_training_completions
CREATE POLICY "Users can view their own training completions"
  ON public.blueprint_training_completions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own training completions"
  ON public.blueprint_training_completions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Brand members can view training completions for their blueprints"
  ON public.blueprint_training_completions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.blueprints b
      JOIN public.brand_members bm ON bm.brand_id = b.brand_id
      WHERE b.id = blueprint_id AND bm.user_id = auth.uid()
    )
  );

-- Add comments
COMMENT ON COLUMN public.blueprints.training_modules IS 'Array of training modules for creators';
COMMENT ON TABLE public.blueprint_training_completions IS 'Tracks creator completion of blueprint training modules';
