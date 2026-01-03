
-- Add missing columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS resume_url text,
ADD COLUMN IF NOT EXISTS portfolio_items jsonb DEFAULT '[]'::jsonb;

-- Add missing column to blueprints table
ALTER TABLE public.blueprints 
ADD COLUMN IF NOT EXISTS training_modules jsonb DEFAULT '[]'::jsonb;

-- Create brand_referrals table
CREATE TABLE IF NOT EXISTS public.brand_referrals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  referrer_brand_id uuid REFERENCES public.brands(id) ON DELETE SET NULL,
  referral_code text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  commission_rate numeric DEFAULT 0.1,
  total_earned numeric DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on brand_referrals
ALTER TABLE public.brand_referrals ENABLE ROW LEVEL SECURITY;

-- RLS policies for brand_referrals
DROP POLICY IF EXISTS "Brand members can view their brand referrals" ON public.brand_referrals;
CREATE POLICY "Brand members can view their brand referrals"
  ON public.brand_referrals
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.brand_members
      WHERE brand_members.brand_id = brand_referrals.brand_id
      AND brand_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Brand members can insert referrals for their brand" ON public.brand_referrals;
CREATE POLICY "Brand members can insert referrals for their brand"
  ON public.brand_referrals
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.brand_members
      WHERE brand_members.brand_id = brand_referrals.brand_id
      AND brand_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Brand members can update their brand referrals" ON public.brand_referrals;
CREATE POLICY "Brand members can update their brand referrals"
  ON public.brand_referrals
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.brand_members
      WHERE brand_members.brand_id = brand_referrals.brand_id
      AND brand_members.user_id = auth.uid()
    )
  );

-- Create blueprint_training_completions table
CREATE TABLE IF NOT EXISTS public.blueprint_training_completions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blueprint_id uuid NOT NULL REFERENCES public.blueprints(id) ON DELETE CASCADE,
  module_id text NOT NULL,
  completed_at timestamp with time zone NOT NULL DEFAULT now(),
  quiz_score numeric,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, blueprint_id, module_id)
);

-- Enable RLS on blueprint_training_completions
ALTER TABLE public.blueprint_training_completions ENABLE ROW LEVEL SECURITY;

-- RLS policies for blueprint_training_completions
DROP POLICY IF EXISTS "Users can view their own training completions" ON public.blueprint_training_completions;
CREATE POLICY "Users can view their own training completions"
  ON public.blueprint_training_completions
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own training completions" ON public.blueprint_training_completions;
CREATE POLICY "Users can insert their own training completions"
  ON public.blueprint_training_completions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own training completions" ON public.blueprint_training_completions;
CREATE POLICY "Users can update their own training completions"
  ON public.blueprint_training_completions
  FOR UPDATE
  USING (auth.uid() = user_id);
