-- Create boost_view_bonuses table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.boost_view_bonuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  boost_id uuid NOT NULL REFERENCES public.bounty_campaigns(id) ON DELETE CASCADE,
  views_threshold integer NOT NULL,
  bonus_amount numeric NOT NULL,
  bonus_type text NOT NULL DEFAULT 'milestone',
  cpm_rate numeric DEFAULT NULL,
  min_views integer DEFAULT NULL,
  created_at timestamptz DEFAULT now()
);

-- Add RLS
ALTER TABLE public.boost_view_bonuses ENABLE ROW LEVEL SECURITY;

-- Policies for boost_view_bonuses
CREATE POLICY "Anyone can view boost view bonuses"
ON public.boost_view_bonuses FOR SELECT
USING (true);

CREATE POLICY "Brand members can manage boost view bonuses"
ON public.boost_view_bonuses FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.bounty_campaigns bc
    JOIN public.brand_members bm ON bc.brand_id = bm.brand_id
    WHERE bc.id = boost_view_bonuses.boost_id
    AND bm.user_id = auth.uid()
  )
);

-- Add comment for clarity
COMMENT ON COLUMN public.boost_view_bonuses.bonus_type IS 'Type of bonus: milestone (flat bonus at view threshold) or cpm (rate per 1K views up to threshold)';
COMMENT ON COLUMN public.boost_view_bonuses.cpm_rate IS 'CPM rate in dollars per 1,000 views (only used when bonus_type = cpm)';