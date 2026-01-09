-- Fix function search path security warnings
CREATE OR REPLACE FUNCTION has_admin_permission(
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

CREATE OR REPLACE FUNCTION update_admin_permissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';