-- Create referral_teams table for team management
CREATE TABLE public.referral_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  commission_rate numeric NOT NULL DEFAULT 5 CHECK (commission_rate >= 0 AND commission_rate <= 50),
  referral_code text UNIQUE NOT NULL,
  total_earnings numeric DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (owner_id)
);

-- Create referral_team_members table
CREATE TABLE public.referral_team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.referral_teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  total_contributed numeric DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

-- Create referral_team_invitations table
CREATE TABLE public.referral_team_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.referral_teams(id) ON DELETE CASCADE,
  email text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  invited_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '14 days'),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.referral_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_team_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for referral_teams
CREATE POLICY "Users can view their own team"
  ON public.referral_teams FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can create their own team"
  ON public.referral_teams FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own team"
  ON public.referral_teams FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own team"
  ON public.referral_teams FOR DELETE
  USING (auth.uid() = owner_id);

CREATE POLICY "Anyone can view teams by referral code"
  ON public.referral_teams FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage all teams"
  ON public.referral_teams FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for referral_team_members
CREATE POLICY "Team owners can view their members"
  ON public.referral_team_members FOR SELECT
  USING (
    team_id IN (SELECT id FROM public.referral_teams WHERE owner_id = auth.uid())
    OR user_id = auth.uid()
  );

CREATE POLICY "Users can join teams"
  ON public.referral_team_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Team owners can remove members"
  ON public.referral_team_members FOR DELETE
  USING (
    team_id IN (SELECT id FROM public.referral_teams WHERE owner_id = auth.uid())
    OR user_id = auth.uid()
  );

CREATE POLICY "Admins can manage all team members"
  ON public.referral_team_members FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for referral_team_invitations
CREATE POLICY "Team owners can view their invitations"
  ON public.referral_team_invitations FOR SELECT
  USING (
    team_id IN (SELECT id FROM public.referral_teams WHERE owner_id = auth.uid())
  );

CREATE POLICY "Team owners can create invitations"
  ON public.referral_team_invitations FOR INSERT
  WITH CHECK (
    team_id IN (SELECT id FROM public.referral_teams WHERE owner_id = auth.uid())
  );

CREATE POLICY "Team owners can update invitations"
  ON public.referral_team_invitations FOR UPDATE
  USING (
    team_id IN (SELECT id FROM public.referral_teams WHERE owner_id = auth.uid())
  );

CREATE POLICY "Team owners can delete invitations"
  ON public.referral_team_invitations FOR DELETE
  USING (
    team_id IN (SELECT id FROM public.referral_teams WHERE owner_id = auth.uid())
  );

CREATE POLICY "Users can view invitations sent to them"
  ON public.referral_team_invitations FOR SELECT
  USING (email = get_current_user_email());

CREATE POLICY "Admins can manage all invitations"
  ON public.referral_team_invitations FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_referral_teams_updated_at
  BEFORE UPDATE ON public.referral_teams
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_referral_team_invitations_updated_at
  BEFORE UPDATE ON public.referral_team_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();