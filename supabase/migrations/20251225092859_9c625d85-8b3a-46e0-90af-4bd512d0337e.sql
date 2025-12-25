-- Drop the deferrable constraints and recreate as non-deferrable
ALTER TABLE public.brand_creator_relationships DROP CONSTRAINT IF EXISTS unique_brand_user;
ALTER TABLE public.brand_creator_relationships DROP CONSTRAINT IF EXISTS unique_brand_external;

-- Recreate as non-deferrable for ON CONFLICT to work
CREATE UNIQUE INDEX idx_unique_brand_user ON public.brand_creator_relationships (brand_id, user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX idx_unique_brand_external ON public.brand_creator_relationships (brand_id, external_email) WHERE external_email IS NOT NULL;