-- Add bonus_type column to boost_view_bonuses table
-- Supports: 'milestone' (flat bonus at threshold) and 'cpm' (rate per 1K views up to threshold)
ALTER TABLE public.boost_view_bonuses 
ADD COLUMN bonus_type text NOT NULL DEFAULT 'milestone';

-- Add cpm_rate column for CPM-type bonuses ($ per 1,000 views)
ALTER TABLE public.boost_view_bonuses 
ADD COLUMN cpm_rate numeric DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.boost_view_bonuses.bonus_type IS 'Type of bonus: milestone (flat bonus at view threshold) or cpm (rate per 1K views up to threshold)';
COMMENT ON COLUMN public.boost_view_bonuses.cpm_rate IS 'CPM rate in dollars per 1,000 views (only used when bonus_type = cpm)';