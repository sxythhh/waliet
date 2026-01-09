-- Fix ON CONFLICT in create_relationship_from_campaign_submission trigger
-- The trigger uses: ON CONFLICT (brand_id, user_id)
-- Add a matching unique constraint (multiple NULL user_id rows are allowed in Postgres)
ALTER TABLE public.brand_creator_relationships
ADD CONSTRAINT brand_creator_relationships_brand_id_user_id_key
UNIQUE (brand_id, user_id);