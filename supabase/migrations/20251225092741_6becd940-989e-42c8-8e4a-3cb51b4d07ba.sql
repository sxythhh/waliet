-- Function to create/update brand_creator_relationship from campaign submission
CREATE OR REPLACE FUNCTION public.create_relationship_from_campaign_submission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_brand_id UUID;
BEGIN
  -- Get the brand_id from the campaign
  SELECT brand_id INTO v_brand_id
  FROM public.campaigns
  WHERE id = NEW.campaign_id;
  
  IF v_brand_id IS NOT NULL THEN
    -- Insert or update the relationship
    INSERT INTO public.brand_creator_relationships (
      brand_id,
      user_id,
      source_type,
      source_id,
      first_interaction_at
    )
    VALUES (
      v_brand_id,
      NEW.creator_id,
      'campaign_application',
      NEW.campaign_id,
      COALESCE(NEW.submitted_at, now())
    )
    ON CONFLICT (brand_id, user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger on campaign_submissions
CREATE TRIGGER create_relationship_on_campaign_submission
  AFTER INSERT ON public.campaign_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.create_relationship_from_campaign_submission();

-- Function to create/update brand_creator_relationship from bounty application
CREATE OR REPLACE FUNCTION public.create_relationship_from_bounty_application()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_brand_id UUID;
BEGIN
  -- Get the brand_id from the bounty campaign
  SELECT brand_id INTO v_brand_id
  FROM public.bounty_campaigns
  WHERE id = NEW.bounty_campaign_id;
  
  IF v_brand_id IS NOT NULL THEN
    -- Insert or update the relationship
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
    )
    ON CONFLICT (brand_id, user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger on bounty_applications
CREATE TRIGGER create_relationship_on_bounty_application
  AFTER INSERT ON public.bounty_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.create_relationship_from_bounty_application();

-- Function to create/update brand_creator_relationship from boost video submission
CREATE OR REPLACE FUNCTION public.create_relationship_from_boost_submission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_brand_id UUID;
BEGIN
  -- Get the brand_id from the bounty campaign
  SELECT brand_id INTO v_brand_id
  FROM public.bounty_campaigns
  WHERE id = NEW.bounty_campaign_id;
  
  IF v_brand_id IS NOT NULL THEN
    -- Insert or update the relationship
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
      'video_submission',
      NEW.bounty_campaign_id,
      COALESCE(NEW.submitted_at, now())
    )
    ON CONFLICT (brand_id, user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger on boost_video_submissions
CREATE TRIGGER create_relationship_on_boost_submission
  AFTER INSERT ON public.boost_video_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.create_relationship_from_boost_submission();

-- Function to create/update brand_creator_relationship from campaign video
CREATE OR REPLACE FUNCTION public.create_relationship_from_campaign_video()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_brand_id UUID;
BEGIN
  -- Get the brand_id from the campaign
  SELECT brand_id INTO v_brand_id
  FROM public.campaigns
  WHERE id = NEW.campaign_id;
  
  IF v_brand_id IS NOT NULL THEN
    -- Insert or update the relationship
    INSERT INTO public.brand_creator_relationships (
      brand_id,
      user_id,
      source_type,
      source_id,
      first_interaction_at
    )
    VALUES (
      v_brand_id,
      NEW.creator_id,
      'video_submission',
      NEW.campaign_id,
      COALESCE(NEW.created_at, now())
    )
    ON CONFLICT (brand_id, user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger on campaign_videos
CREATE TRIGGER create_relationship_on_campaign_video
  AFTER INSERT ON public.campaign_videos
  FOR EACH ROW
  EXECUTE FUNCTION public.create_relationship_from_campaign_video();