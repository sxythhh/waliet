-- Admin Permissions System
-- Granular permissions for admin users

-- Create admin_permissions table
CREATE TABLE IF NOT EXISTS admin_permissions (
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

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_admin_permissions_user_id ON admin_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_permissions_resource ON admin_permissions(resource);

-- Enable RLS
ALTER TABLE admin_permissions ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can view permissions
CREATE POLICY "Admins can view all permissions" ON admin_permissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Policy: Only admins can insert permissions
CREATE POLICY "Admins can insert permissions" ON admin_permissions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Policy: Only admins can update permissions
CREATE POLICY "Admins can update permissions" ON admin_permissions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Policy: Only admins can delete permissions
CREATE POLICY "Admins can delete permissions" ON admin_permissions
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Function to check if user has permission
CREATE OR REPLACE FUNCTION has_admin_permission(
  _user_id UUID,
  _resource TEXT,
  _action TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  -- First check if user is an admin at all
  IF NOT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = _user_id
    AND role = 'admin'
  ) THEN
    RETURN false;
  END IF;

  -- If no specific permissions exist for this user, they have full access (legacy behavior)
  IF NOT EXISTS (
    SELECT 1 FROM admin_permissions
    WHERE user_id = _user_id
  ) THEN
    RETURN true;
  END IF;

  -- Check specific permission
  RETURN EXISTS (
    SELECT 1 FROM admin_permissions
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION has_admin_permission TO authenticated;

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_admin_permissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_admin_permissions_updated_at
  BEFORE UPDATE ON admin_permissions
  FOR EACH ROW
  EXECUTE FUNCTION update_admin_permissions_updated_at();