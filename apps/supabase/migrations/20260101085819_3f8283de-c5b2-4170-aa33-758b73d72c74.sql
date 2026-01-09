-- Admin Permissions System (combined migrations)

-- Create admin_permissions table if not exists
CREATE TABLE IF NOT EXISTS public.admin_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  resource TEXT NOT NULL,
  can_view BOOLEAN DEFAULT true,
  can_edit BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, resource)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_admin_permissions_user_id ON public.admin_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_permissions_resource ON public.admin_permissions(resource);

-- Enable RLS
ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can view all permissions" ON public.admin_permissions;
DROP POLICY IF EXISTS "Admins can insert permissions" ON public.admin_permissions;
DROP POLICY IF EXISTS "Admins can update permissions" ON public.admin_permissions;
DROP POLICY IF EXISTS "Admins can delete permissions" ON public.admin_permissions;

-- Policy: Only admins can view permissions
CREATE POLICY "Admins can view all permissions" ON public.admin_permissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Policy: Only admins can insert permissions
CREATE POLICY "Admins can insert permissions" ON public.admin_permissions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Policy: Only admins can update permissions
CREATE POLICY "Admins can update permissions" ON public.admin_permissions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Policy: Only admins can delete permissions
CREATE POLICY "Admins can delete permissions" ON public.admin_permissions
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Function to check if user has permission (with secure search_path)
CREATE OR REPLACE FUNCTION public.has_admin_permission(
  _user_id UUID,
  _resource TEXT,
  _action TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  -- First check if user is an admin at all
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
    AND role = 'admin'
  ) THEN
    RETURN false;
  END IF;

  -- If no specific permissions exist for this user, they have full access (legacy behavior)
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_permissions
    WHERE user_id = _user_id
  ) THEN
    RETURN true;
  END IF;

  -- Check specific permission
  RETURN EXISTS (
    SELECT 1 FROM public.admin_permissions
    WHERE user_id = _user_id
    AND resource = _resource
    AND CASE
      WHEN _action = 'view' THEN can_view
      WHEN _action = 'edit' THEN can_edit
      WHEN _action = 'delete' THEN can_delete
      ELSE false
    END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.has_admin_permission TO authenticated;

-- Updated at trigger function (with secure search_path)
CREATE OR REPLACE FUNCTION public.update_admin_permissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS update_admin_permissions_updated_at ON public.admin_permissions;
CREATE TRIGGER update_admin_permissions_updated_at
  BEFORE UPDATE ON public.admin_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_admin_permissions_updated_at();

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