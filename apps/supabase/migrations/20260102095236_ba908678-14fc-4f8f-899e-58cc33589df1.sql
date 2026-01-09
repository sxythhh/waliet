-- Add trust_score_history table
CREATE TABLE IF NOT EXISTS public.trust_score_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  score NUMERIC NOT NULL,
  score_change NUMERIC DEFAULT 0,
  reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trust_score_history ENABLE ROW LEVEL SECURITY;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_trust_score_history_user_id ON public.trust_score_history(user_id);
CREATE INDEX IF NOT EXISTS idx_trust_score_history_created_at ON public.trust_score_history(created_at DESC);

-- RLS policies for trust_score_history
CREATE POLICY "Users can view their own trust score history"
  ON public.trust_score_history
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all trust score history"
  ON public.trust_score_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can insert trust score history"
  ON public.trust_score_history
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Add trust_score column to profiles if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'trust_score'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN trust_score NUMERIC DEFAULT 100;
  END IF;
END $$;

-- Create trigger function to log trust score changes
CREATE OR REPLACE FUNCTION public.log_trust_score_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.trust_score IS DISTINCT FROM OLD.trust_score THEN
    INSERT INTO trust_score_history (user_id, score, score_change, reason)
    VALUES (
      NEW.id,
      NEW.trust_score,
      COALESCE(NEW.trust_score, 100) - COALESCE(OLD.trust_score, 100),
      'Score updated'
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger on profiles table
DROP TRIGGER IF EXISTS on_trust_score_change ON public.profiles;
CREATE TRIGGER on_trust_score_change
  AFTER UPDATE OF trust_score ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_trust_score_change();

-- Add faqs column to blueprints if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'blueprints' AND column_name = 'faqs'
  ) THEN
    ALTER TABLE public.blueprints ADD COLUMN faqs JSONB DEFAULT NULL;
  END IF;
END $$;