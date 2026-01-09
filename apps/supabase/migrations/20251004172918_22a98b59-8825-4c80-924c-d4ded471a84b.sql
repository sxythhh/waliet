-- Create module_completions table to track user progress
CREATE TABLE IF NOT EXISTS public.module_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES public.course_modules(id) ON DELETE CASCADE,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, module_id)
);

-- Enable RLS
ALTER TABLE public.module_completions ENABLE ROW LEVEL SECURITY;

-- Users can view their own completions
CREATE POLICY "Users can view own completions"
ON public.module_completions
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own completions
CREATE POLICY "Users can insert own completions"
ON public.module_completions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own completions (to unmark as complete)
CREATE POLICY "Users can delete own completions"
ON public.module_completions
FOR DELETE
USING (auth.uid() = user_id);

-- Admins can view all completions
CREATE POLICY "Admins can view all completions"
ON public.module_completions
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));