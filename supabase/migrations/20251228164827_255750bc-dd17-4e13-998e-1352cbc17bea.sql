-- Helper functions to avoid RLS policy recursion between teams <-> team_members
CREATE OR REPLACE FUNCTION public.user_is_member_of_team(_user_id uuid, _team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members tm
    WHERE tm.user_id = _user_id
      AND tm.team_id = _team_id
  )
$$;

CREATE OR REPLACE FUNCTION public.user_is_owner_of_team(_user_id uuid, _team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.teams t
    WHERE t.owner_id = _user_id
      AND t.id = _team_id
  )
$$;

CREATE OR REPLACE FUNCTION public.user_owns_any_team(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.teams t
    WHERE t.owner_id = _user_id
  )
$$;

-- Rework teams SELECT policy that referenced team_members (can recurse)
DROP POLICY IF EXISTS "Users can view teams they are members of" ON public.teams;
CREATE POLICY "Users can view teams they are members of"
ON public.teams
FOR SELECT
USING (public.user_is_member_of_team(auth.uid(), id));

-- Rework team_members policies that referenced teams (can recurse)
DROP POLICY IF EXISTS "Team owners can view their members" ON public.team_members;
CREATE POLICY "Team owners can view their members"
ON public.team_members
FOR SELECT
USING (public.user_is_owner_of_team(auth.uid(), team_id));

DROP POLICY IF EXISTS "Team owners can update member commission" ON public.team_members;
CREATE POLICY "Team owners can update member commission"
ON public.team_members
FOR UPDATE
USING (public.user_is_owner_of_team(auth.uid(), team_id));

DROP POLICY IF EXISTS "Team owners can remove members" ON public.team_members;
CREATE POLICY "Team owners can remove members"
ON public.team_members
FOR DELETE
USING (public.user_is_owner_of_team(auth.uid(), team_id));

-- Rework join policy to avoid referencing teams directly
DROP POLICY IF EXISTS "Users can join a team if not already in one and don't own a tea" ON public.team_members;
CREATE POLICY "Users can join a team if not already in one and don't own a team"
ON public.team_members
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND NOT public.user_is_team_member(auth.uid())
  AND NOT public.user_owns_any_team(auth.uid())
);
