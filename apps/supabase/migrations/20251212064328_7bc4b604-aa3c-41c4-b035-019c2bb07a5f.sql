-- =====================================================
-- SECURITY FIX: RLS Policy Remediation (Part 2)
-- =====================================================

-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Brand members can view profiles of campaign applicants" ON public.profiles;

-- Add RLS policies for profiles - authenticated only for own data
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Brand members can view profiles of campaign applicants" 
ON public.profiles 
FOR SELECT 
USING (public.can_view_profile(auth.uid(), id));

-- Fix campaigns - Restrict deletion to brand members only  
DROP POLICY IF EXISTS "Brand members can delete their campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Brand members can update their campaigns" ON public.campaigns;

CREATE POLICY "Brand members can delete their campaigns" 
ON public.campaigns 
FOR DELETE 
USING (
  public.is_brand_member(auth.uid(), brand_id) 
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Brand members can update their campaigns" 
ON public.campaigns 
FOR UPDATE 
USING (
  public.is_brand_member(auth.uid(), brand_id) 
  OR public.has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  public.is_brand_member(auth.uid(), brand_id) 
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- Fix brands - Restrict deletion to brand admins only
DROP POLICY IF EXISTS "Brand admins can delete their brands" ON public.brands;
DROP POLICY IF EXISTS "Brand members can update their brands" ON public.brands;

CREATE POLICY "Brand admins can delete their brands" 
ON public.brands 
FOR DELETE 
USING (
  public.is_brand_admin(auth.uid(), id) 
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Brand members can update their brands" 
ON public.brands 
FOR UPDATE 
USING (
  public.is_brand_member(auth.uid(), id) 
  OR public.has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  public.is_brand_member(auth.uid(), id) 
  OR public.has_role(auth.uid(), 'admin'::app_role)
);