-- Create teams table
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  image_url TEXT,
  invite_code TEXT UNIQUE NOT NULL DEFAULT upper(substr(md5(random()::text), 1, 8)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(owner_id) -- One team per owner
);

-- Create team members table
CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  commission_rate NUMERIC(5,4) NOT NULL DEFAULT 0.05, -- 5% default
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id) -- User can only be in one team
);

-- Create team earnings table to track commissions
CREATE TABLE public.team_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  source_transaction_id UUID NOT NULL REFERENCES public.wallet_transactions(id) ON DELETE CASCADE,
  source_amount NUMERIC NOT NULL,
  commission_rate NUMERIC(5,4) NOT NULL,
  commission_amount NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(source_transaction_id) -- One commission per source transaction
);

-- Enable RLS
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_earnings ENABLE ROW LEVEL SECURITY;

-- Teams policies
CREATE POLICY "Users can view their own team" ON public.teams
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can view teams they are members of" ON public.teams
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.team_members WHERE team_id = teams.id AND user_id = auth.uid())
  );

CREATE POLICY "Anyone can view team by invite code" ON public.teams
  FOR SELECT USING (true);

CREATE POLICY "Team owners can update their team" ON public.teams
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can create a team if not in any team" ON public.teams
  FOR INSERT WITH CHECK (
    auth.uid() = owner_id 
    AND NOT EXISTS (SELECT 1 FROM public.team_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Team owners can delete their team" ON public.teams
  FOR DELETE USING (auth.uid() = owner_id);

-- Team members policies
CREATE POLICY "Team owners can view their members" ON public.team_members
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.teams WHERE id = team_id AND owner_id = auth.uid())
  );

CREATE POLICY "Members can view their own membership" ON public.team_members
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can join a team if not already in one and don't own a team" ON public.team_members
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND NOT EXISTS (SELECT 1 FROM public.team_members WHERE user_id = auth.uid())
    AND NOT EXISTS (SELECT 1 FROM public.teams WHERE owner_id = auth.uid())
  );

CREATE POLICY "Team owners can update member commission" ON public.team_members
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.teams WHERE id = team_id AND owner_id = auth.uid())
  );

CREATE POLICY "Members can leave team" ON public.team_members
  FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "Team owners can remove members" ON public.team_members
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.teams WHERE id = team_id AND owner_id = auth.uid())
  );

-- Team earnings policies
CREATE POLICY "Team owners can view earnings" ON public.team_earnings
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.teams WHERE id = team_id AND owner_id = auth.uid())
  );

CREATE POLICY "Members can view their contribution" ON public.team_earnings
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.team_members WHERE id = member_id AND user_id = auth.uid())
  );

-- Function to pay team commission on earnings
CREATE OR REPLACE FUNCTION public.pay_team_commission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  member_record RECORD;
  team_record RECORD;
  commission_amount NUMERIC;
BEGIN
  -- Only process for completed earnings
  IF NEW.type != 'earning' OR NEW.status != 'completed' OR NEW.amount <= 0 THEN
    RETURN NEW;
  END IF;
  
  -- Check if user is a team member
  SELECT tm.*, t.id as team_id, t.owner_id
  INTO member_record
  FROM public.team_members tm
  INNER JOIN public.teams t ON t.id = tm.team_id
  WHERE tm.user_id = NEW.user_id
    AND tm.status = 'active'
  LIMIT 1;
  
  IF member_record.id IS NOT NULL THEN
    -- Calculate commission
    commission_amount := ROUND(NEW.amount * member_record.commission_rate, 2);
    
    IF commission_amount > 0 THEN
      -- Deduct from member's transaction (they receive less)
      NEW.amount := NEW.amount - commission_amount;
      
      -- Credit commission to team owner's wallet
      UPDATE public.wallets
      SET balance = COALESCE(balance, 0) + commission_amount,
          total_earned = COALESCE(total_earned, 0) + commission_amount
      WHERE user_id = member_record.owner_id;
      
      -- Create wallet transaction for team owner
      INSERT INTO public.wallet_transactions (user_id, amount, type, status, description, metadata)
      VALUES (
        member_record.owner_id,
        commission_amount,
        'earning',
        'completed',
        'Team commission from member earnings',
        jsonb_build_object(
          'source_type', 'team_commission',
          'member_id', NEW.user_id,
          'team_id', member_record.team_id,
          'commission_rate', member_record.commission_rate,
          'source_amount', NEW.amount + commission_amount
        )
      );
      
      -- Log the team earning
      INSERT INTO public.team_earnings (team_id, member_id, source_transaction_id, source_amount, commission_rate, commission_amount)
      VALUES (
        member_record.team_id,
        member_record.id,
        NEW.id,
        NEW.amount + commission_amount,
        member_record.commission_rate,
        commission_amount
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for team commission
CREATE TRIGGER on_earning_pay_team_commission
  BEFORE INSERT ON public.wallet_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.pay_team_commission();

-- Indexes for performance
CREATE INDEX idx_team_members_team_id ON public.team_members(team_id);
CREATE INDEX idx_team_members_user_id ON public.team_members(user_id);
CREATE INDEX idx_team_earnings_team_id ON public.team_earnings(team_id);
CREATE INDEX idx_teams_invite_code ON public.teams(invite_code);