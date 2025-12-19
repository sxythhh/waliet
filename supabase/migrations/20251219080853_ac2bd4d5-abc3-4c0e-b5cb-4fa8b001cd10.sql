-- Drop existing insert policy and recreate it to allow null brand_id (global videos)
DROP POLICY IF EXISTS "Brand members can insert scope videos" ON public.scope_videos;

CREATE POLICY "Brand members can insert scope videos" 
ON public.scope_videos 
FOR INSERT 
WITH CHECK (
  -- Allow global videos (brand_id is null) for admins
  (brand_id IS NULL AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND email LIKE '%@virality.cc'
  ))
  OR
  -- Allow brand-specific videos for brand members
  (brand_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.brand_members 
    WHERE brand_members.brand_id = scope_videos.brand_id 
    AND brand_members.user_id = auth.uid()
  ))
);

-- Also update the update policy for completeness
DROP POLICY IF EXISTS "Brand members can update scope videos" ON public.scope_videos;

CREATE POLICY "Brand members can update scope videos" 
ON public.scope_videos 
FOR UPDATE 
USING (
  -- Allow admins to update any video (including global)
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND email LIKE '%@virality.cc'
  )
  OR
  -- Allow brand members to update their brand's videos
  (brand_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.brand_members 
    WHERE brand_members.brand_id = scope_videos.brand_id 
    AND brand_members.user_id = auth.uid()
  ))
);

-- Update delete policy too
DROP POLICY IF EXISTS "Brand members can delete scope videos" ON public.scope_videos;

CREATE POLICY "Brand members can delete scope videos" 
ON public.scope_videos 
FOR DELETE 
USING (
  -- Allow admins to delete any video
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND email LIKE '%@virality.cc'
  )
  OR
  -- Allow brand members to delete their brand's videos
  (brand_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.brand_members 
    WHERE brand_members.brand_id = scope_videos.brand_id 
    AND brand_members.user_id = auth.uid()
  ))
);

-- Update select policy to include global videos
DROP POLICY IF EXISTS "Brand members can view scope videos" ON public.scope_videos;

CREATE POLICY "Brand members can view scope videos" 
ON public.scope_videos 
FOR SELECT 
USING (
  -- Allow viewing global videos (null brand_id) for all authenticated users
  brand_id IS NULL
  OR
  -- Allow brand members to view their brand's videos
  EXISTS (
    SELECT 1 FROM public.brand_members 
    WHERE brand_members.brand_id = scope_videos.brand_id 
    AND brand_members.user_id = auth.uid()
  )
  OR
  -- Allow admins to view all
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND email LIKE '%@virality.cc'
  )
);