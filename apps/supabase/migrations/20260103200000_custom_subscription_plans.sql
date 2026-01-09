-- Custom subscription plans for brands
-- Allows admins to create custom pricing/limits for specific brands

CREATE TABLE IF NOT EXISTS public.custom_brand_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  -- Limits: NULL = use standard plan limits, -1 = unlimited
  campaigns_limit INTEGER,
  boosts_limit INTEGER,
  hires_limit INTEGER,
  -- Pricing info (for reference/display)
  monthly_price NUMERIC,
  -- Whop integration
  whop_plan_id TEXT,
  whop_product_type TEXT CHECK (whop_product_type IN ('subscription', 'one_time', 'manual')),
  -- Status
  is_active BOOLEAN DEFAULT true,
  -- Audit
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  -- Ensure only one active custom plan per brand
  UNIQUE(brand_id)
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_custom_brand_plans_brand_id ON public.custom_brand_plans(brand_id);
CREATE INDEX IF NOT EXISTS idx_custom_brand_plans_active ON public.custom_brand_plans(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.custom_brand_plans ENABLE ROW LEVEL SECURITY;

-- Admin-only policies (using user_roles table)
DROP POLICY IF EXISTS "Admins can view all custom plans" ON public.custom_brand_plans;
CREATE POLICY "Admins can view all custom plans"
  ON public.custom_brand_plans
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can insert custom plans" ON public.custom_brand_plans;
CREATE POLICY "Admins can insert custom plans"
  ON public.custom_brand_plans
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update custom plans" ON public.custom_brand_plans;
CREATE POLICY "Admins can update custom plans"
  ON public.custom_brand_plans
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can delete custom plans" ON public.custom_brand_plans;
CREATE POLICY "Admins can delete custom plans"
  ON public.custom_brand_plans
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Brand owners can view their own custom plan
DROP POLICY IF EXISTS "Brand owners can view their custom plan" ON public.custom_brand_plans;
CREATE POLICY "Brand owners can view their custom plan"
  ON public.custom_brand_plans
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.brand_members
      WHERE brand_members.brand_id = custom_brand_plans.brand_id
      AND brand_members.user_id = auth.uid()
      AND brand_members.role = 'owner'
    )
  );

-- Updated at trigger
CREATE OR REPLACE FUNCTION public.handle_custom_plan_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_custom_plan_updated_at ON public.custom_brand_plans;
CREATE TRIGGER set_custom_plan_updated_at
  BEFORE UPDATE ON public.custom_brand_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_custom_plan_updated_at();

-- Function to get effective plan limits for a brand
CREATE OR REPLACE FUNCTION public.get_effective_brand_limits(p_brand_id UUID)
RETURNS TABLE (
  campaigns_limit INTEGER,
  boosts_limit INTEGER,
  hires_limit INTEGER,
  is_custom BOOLEAN,
  custom_plan_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cp.campaigns_limit,
    cp.boosts_limit,
    cp.hires_limit,
    true AS is_custom,
    cp.name AS custom_plan_name
  FROM public.custom_brand_plans cp
  WHERE cp.brand_id = p_brand_id
    AND cp.is_active = true
  LIMIT 1;

  -- If no custom plan found, return nulls (caller uses standard limits)
  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::INTEGER, NULL::INTEGER, NULL::INTEGER, false, NULL::TEXT;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
