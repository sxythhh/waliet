-- This migration adds a helper function to grant admin access
-- After team@virality.cc signs up, run this query replacing <USER_ID>:
-- INSERT INTO public.user_roles (user_id, role) VALUES ('<USER_ID>', 'admin')
-- on conflict (user_id, role) do nothing;

-- You can find the user_id by running:
-- SELECT id, email FROM auth.users WHERE email = 'team@virality.cc';

-- Creating a helper comment for documentation
COMMENT ON TABLE public.user_roles IS 'Stores user roles. To grant admin: INSERT INTO public.user_roles (user_id, role) VALUES (user_id, ''admin'') ON CONFLICT DO NOTHING;';