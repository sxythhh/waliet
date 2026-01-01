-- Create the function to create default creator tiers for a brand
CREATE OR REPLACE FUNCTION public.create_default_creator_tiers(p_brand_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert default tiers if none exist for this brand
  IF NOT EXISTS (SELECT 1 FROM creator_tiers WHERE brand_id = p_brand_id) THEN
    INSERT INTO creator_tiers (brand_id, name, description, tier_order, rpm_multiplier, color, is_default)
    VALUES
      (p_brand_id, 'Bronze', 'Entry level tier for new creators', 1, 1.0, '#CD7F32', true),
      (p_brand_id, 'Silver', 'For consistent performers', 2, 1.25, '#C0C0C0', false),
      (p_brand_id, 'Gold', 'For top performers', 3, 1.5, '#FFD700', false),
      (p_brand_id, 'Platinum', 'Elite creator status', 4, 2.0, '#E5E4E2', false);
  END IF;
END;
$$;