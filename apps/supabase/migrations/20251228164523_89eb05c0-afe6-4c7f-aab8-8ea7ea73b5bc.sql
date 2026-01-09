-- Create a security definer function to check if user is in any team
CREATE OR REPLACE FUNCTION public.user_is_team_member(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members
    WHERE user_id = _user_id
  )
$$;

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can create a team if not in any team" ON public.teams;

-- Recreate with security definer function
CREATE POLICY "Users can create a team if not in any team" 
ON public.teams 
FOR INSERT 
WITH CHECK (
  auth.uid() = owner_id 
  AND NOT public.user_is_team_member(auth.uid())
);