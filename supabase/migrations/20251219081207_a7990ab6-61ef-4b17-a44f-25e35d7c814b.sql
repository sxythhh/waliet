-- Update RLS policies for scope_video_saves to allow brand members to save videos

-- Drop existing policies if any
DROP POLICY IF EXISTS "Brand members can insert scope video saves" ON public.scope_video_saves;
DROP POLICY IF EXISTS "Brand members can delete scope video saves" ON public.scope_video_saves;
DROP POLICY IF EXISTS "Brand members can view scope video saves" ON public.scope_video_saves;

-- Allow brand members to insert saves for blueprints they have access to
CREATE POLICY "Brand members can insert scope video saves" 
ON public.scope_video_saves 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.blueprints b
    JOIN public.brand_members bm ON bm.brand_id = b.brand_id
    WHERE b.id = scope_video_saves.blueprint_id
    AND bm.user_id = auth.uid()
  )
);

-- Allow brand members to delete their saves
CREATE POLICY "Brand members can delete scope video saves" 
ON public.scope_video_saves 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.blueprints b
    JOIN public.brand_members bm ON bm.brand_id = b.brand_id
    WHERE b.id = scope_video_saves.blueprint_id
    AND bm.user_id = auth.uid()
  )
);

-- Allow brand members to view saves for their blueprints
CREATE POLICY "Brand members can view scope video saves" 
ON public.scope_video_saves 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.blueprints b
    JOIN public.brand_members bm ON bm.brand_id = b.brand_id
    WHERE b.id = scope_video_saves.blueprint_id
    AND bm.user_id = auth.uid()
  )
);