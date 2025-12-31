-- Create creator tiers table for brand-specific tier configurations
CREATE TABLE public.creator_tiers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  tier_order INTEGER NOT NULL, -- Lower = better tier (1 = top tier)
  rpm_multiplier NUMERIC NOT NULL DEFAULT 1.0, -- Rate multiplier for this tier
  color TEXT, -- For UI display
  icon TEXT, -- Icon name for display
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(brand_id, name),
  UNIQUE(brand_id, tier_order)
);

-- Create tier promotion rules
CREATE TABLE public.tier_promotion_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  from_tier_id UUID REFERENCES public.creator_tiers(id) ON DELETE CASCADE,
  to_tier_id UUID NOT NULL REFERENCES public.creator_tiers(id) ON DELETE CASCADE,
  rule_type TEXT NOT NULL CHECK (rule_type IN (
    'min_total_views',
    'min_avg_views',
    'min_videos_count',
    'min_total_earnings',
    'min_avg_engagement',
    'max_rejection_rate',
    'min_days_active'
  )),
  threshold_value NUMERIC NOT NULL,
  evaluation_period_days INTEGER, -- NULL means all time
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT different_tiers CHECK (from_tier_id IS NULL OR from_tier_id != to_tier_id)
);

-- Track creator tier assignments per brand
CREATE TABLE public.creator_tier_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier_id UUID NOT NULL REFERENCES public.creator_tiers(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  assigned_by TEXT CHECK (assigned_by IN ('manual', 'auto')),
  previous_tier_id UUID REFERENCES public.creator_tiers(id) ON DELETE SET NULL,
  UNIQUE(brand_id, user_id)
);

-- Track tier change history
CREATE TABLE public.tier_change_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_tier_id UUID REFERENCES public.creator_tiers(id) ON DELETE SET NULL,
  to_tier_id UUID NOT NULL REFERENCES public.creator_tiers(id) ON DELETE CASCADE,
  change_type TEXT NOT NULL CHECK (change_type IN ('promotion', 'demotion', 'initial', 'manual')),
  rule_id UUID REFERENCES public.tier_promotion_rules(id) ON DELETE SET NULL,
  metrics_snapshot JSONB, -- Store the metrics that triggered the change
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.creator_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tier_promotion_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_tier_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tier_change_log ENABLE ROW LEVEL SECURITY;

-- Tiers policies
CREATE POLICY "Brand members can manage tiers"
ON public.creator_tiers
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.brand_members
    WHERE brand_members.brand_id = creator_tiers.brand_id
    AND brand_members.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.brand_members
    WHERE brand_members.brand_id = creator_tiers.brand_id
    AND brand_members.user_id = auth.uid()
  )
);

-- Promotion rules policies
CREATE POLICY "Brand members can manage tier rules"
ON public.tier_promotion_rules
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.brand_members
    WHERE brand_members.brand_id = tier_promotion_rules.brand_id
    AND brand_members.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.brand_members
    WHERE brand_members.brand_id = tier_promotion_rules.brand_id
    AND brand_members.user_id = auth.uid()
  )
);

-- Assignments policies
CREATE POLICY "Brand members can view assignments"
ON public.creator_tier_assignments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.brand_members
    WHERE brand_members.brand_id = creator_tier_assignments.brand_id
    AND brand_members.user_id = auth.uid()
  )
);

CREATE POLICY "Users can view own tier"
ON public.creator_tier_assignments
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Brand members can manage assignments"
ON public.creator_tier_assignments
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.brand_members
    WHERE brand_members.brand_id = creator_tier_assignments.brand_id
    AND brand_members.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.brand_members
    WHERE brand_members.brand_id = creator_tier_assignments.brand_id
    AND brand_members.user_id = auth.uid()
  )
);

-- Log policies
CREATE POLICY "Brand members can view tier logs"
ON public.tier_change_log
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.brand_members
    WHERE brand_members.brand_id = tier_change_log.brand_id
    AND brand_members.user_id = auth.uid()
  )
);

CREATE POLICY "Users can view own tier logs"
ON public.tier_change_log
FOR SELECT
USING (auth.uid() = user_id);

-- System can manage logs
CREATE POLICY "System can manage tier logs"
ON public.tier_change_log
FOR ALL
USING (true)
WITH CHECK (true);

-- Indexes
CREATE INDEX creator_tiers_brand_idx ON public.creator_tiers(brand_id);
CREATE INDEX tier_promotion_rules_brand_idx ON public.tier_promotion_rules(brand_id);
CREATE INDEX tier_promotion_rules_to_tier_idx ON public.tier_promotion_rules(to_tier_id);
CREATE INDEX creator_tier_assignments_brand_idx ON public.creator_tier_assignments(brand_id);
CREATE INDEX creator_tier_assignments_user_idx ON public.creator_tier_assignments(user_id);
CREATE INDEX tier_change_log_brand_idx ON public.tier_change_log(brand_id);
CREATE INDEX tier_change_log_user_idx ON public.tier_change_log(user_id);

-- Function to create default tiers for a brand
CREATE OR REPLACE FUNCTION public.create_default_creator_tiers(p_brand_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO public.creator_tiers (brand_id, name, description, tier_order, rpm_multiplier, color, is_default) VALUES
    (p_brand_id, 'Bronze', 'Starting tier for new creators', 4, 1.0, '#CD7F32', true),
    (p_brand_id, 'Silver', 'Growing creators with consistent performance', 3, 1.1, '#C0C0C0', false),
    (p_brand_id, 'Gold', 'Top performers with excellent metrics', 2, 1.25, '#FFD700', false),
    (p_brand_id, 'Platinum', 'Elite creators with outstanding performance', 1, 1.5, '#E5E4E2', false)
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
