-- =============================================
-- EXPLICIT ADMIN PERMISSIONS MIGRATION
-- Grants explicit full access to existing admins with no permissions
-- This is required before changing the default behavior to deny-by-default
-- =============================================

-- Insert full access permissions for all existing admins who have no permission records
-- This preserves their current access level while enabling the new default-deny behavior
INSERT INTO admin_permissions (user_id, resource, can_view, can_edit, can_delete)
SELECT
  ur.user_id,
  r.resource,
  true,  -- can_view
  true,  -- can_edit
  true   -- can_delete
FROM user_roles ur
CROSS JOIN (
  VALUES
    ('dashboard'),
    ('users'),
    ('brands'),
    ('creators'),
    ('payouts'),
    ('security'),
    ('resources'),
    ('permissions'),
    ('reports'),
    ('finance'),
    ('emails'),
    ('tools')
) AS r(resource)
WHERE ur.role = 'admin'
AND NOT EXISTS (
  SELECT 1 FROM admin_permissions ap WHERE ap.user_id = ur.user_id
)
ON CONFLICT (user_id, resource) DO NOTHING;

-- Add a comment explaining the migration
COMMENT ON TABLE admin_permissions IS
'Admin permissions table. After this migration, permissions.length === 0 means NO access (default deny),
not full access. All existing unrestricted admins have been granted explicit full-access records.';
