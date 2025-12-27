-- Fix the trigger function to handle partial unique index properly
CREATE OR REPLACE FUNCTION public.create_relationship_from_bounty_application()
RETURNS TRIGGER AS $$
DECLARE
  v_brand_id UUID;
  v_existing_id UUID;
BEGIN
  -- Get the brand_id from the bounty campaign
  SELECT brand_id INTO v_brand_id
  FROM public.bounty_campaigns
  WHERE id = NEW.bounty_campaign_id;
  
  IF v_brand_id IS NOT NULL THEN
    -- Check if relationship already exists
    SELECT id INTO v_existing_id
    FROM public.brand_creator_relationships
    WHERE brand_id = v_brand_id AND user_id = NEW.user_id;
    
    -- Only insert if it doesn't exist
    IF v_existing_id IS NULL THEN
      INSERT INTO public.brand_creator_relationships (
        brand_id,
        user_id,
        source_type,
        source_id,
        first_interaction_at
      )
      VALUES (
        v_brand_id,
        NEW.user_id,
        'boost_application',
        NEW.bounty_campaign_id,
        COALESCE(NEW.applied_at, now())
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;