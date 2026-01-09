-- Add min_views column for CPM-type bonuses (minimum views before bonus kicks in)
-- Column may already exist from initial table creation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'boost_view_bonuses'
    AND column_name = 'min_views'
  ) THEN
    ALTER TABLE public.boost_view_bonuses ADD COLUMN min_views integer DEFAULT NULL;
  END IF;
END $$;

COMMENT ON COLUMN public.boost_view_bonuses.min_views IS 'Minimum views before CPM bonus kicks in (only used when bonus_type = cpm)';