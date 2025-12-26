-- Add min_views column for CPM-type bonuses (minimum views before bonus kicks in)
ALTER TABLE public.boost_view_bonuses 
ADD COLUMN min_views integer DEFAULT NULL;

COMMENT ON COLUMN public.boost_view_bonuses.min_views IS 'Minimum views before CPM bonus kicks in (only used when bonus_type = cpm)';