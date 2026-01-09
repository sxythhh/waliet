-- Define referral milestones
CREATE TABLE public.referral_milestones (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  milestone_type text NOT NULL, -- 'signup', 'earnings_reached'
  threshold numeric NOT NULL DEFAULT 0, -- 0 for signup, earnings amount for earnings milestones
  reward_amount numeric NOT NULL,
  display_name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Insert default milestones
INSERT INTO public.referral_milestones (milestone_type, threshold, reward_amount, display_name) VALUES
  ('signup', 0, 0.10, 'User Signup'),
  ('earnings_reached', 10, 1.00, 'First $10 Earned'),
  ('earnings_reached', 50, 2.00, 'First $50 Earned'),
  ('earnings_reached', 100, 5.00, 'First $100 Earned'),
  ('earnings_reached', 500, 10.00, 'First $500 Earned');

-- Track which milestones have been awarded
CREATE TABLE public.referral_milestone_rewards (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referral_id uuid NOT NULL REFERENCES public.referrals(id) ON DELETE CASCADE,
  milestone_id uuid NOT NULL REFERENCES public.referral_milestones(id) ON DELETE CASCADE,
  reward_amount numeric NOT NULL,
  awarded_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(referral_id, milestone_id)
);

-- Enable RLS
ALTER TABLE public.referral_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_milestone_rewards ENABLE ROW LEVEL SECURITY;

-- Policies for milestones (public read)
CREATE POLICY "Anyone can view milestones"
  ON public.referral_milestones FOR SELECT
  USING (true);

-- Policies for milestone rewards
CREATE POLICY "Users can view own referral rewards"
  ON public.referral_milestone_rewards FOR SELECT
  USING (
    referral_id IN (
      SELECT id FROM public.referrals WHERE referrer_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage milestone rewards"
  ON public.referral_milestone_rewards FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Function to award signup milestone when referral is created
CREATE OR REPLACE FUNCTION public.award_signup_milestone()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  signup_milestone_id uuid;
  signup_reward numeric;
BEGIN
  -- Get the signup milestone
  SELECT id, reward_amount INTO signup_milestone_id, signup_reward
  FROM public.referral_milestones
  WHERE milestone_type = 'signup'
  LIMIT 1;
  
  IF signup_milestone_id IS NOT NULL THEN
    -- Insert the milestone reward
    INSERT INTO public.referral_milestone_rewards (referral_id, milestone_id, reward_amount)
    VALUES (NEW.id, signup_milestone_id, signup_reward)
    ON CONFLICT (referral_id, milestone_id) DO NOTHING;
    
    -- Update the referral reward_earned
    UPDATE public.referrals
    SET reward_earned = COALESCE(reward_earned, 0) + signup_reward
    WHERE id = NEW.id;
    
    -- Update referrer's earnings
    UPDATE public.profiles
    SET referral_earnings = COALESCE(referral_earnings, 0) + signup_reward
    WHERE id = NEW.referrer_id;
    
    -- Credit to referrer's wallet
    UPDATE public.wallets
    SET 
      balance = COALESCE(balance, 0) + signup_reward,
      total_earned = COALESCE(total_earned, 0) + signup_reward
    WHERE user_id = NEW.referrer_id;
    
    -- Create transaction record
    INSERT INTO public.wallet_transactions (user_id, amount, type, description, metadata)
    VALUES (
      NEW.referrer_id,
      signup_reward,
      'referral',
      'Referral signup bonus',
      jsonb_build_object('referral_id', NEW.id, 'milestone_type', 'signup')
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger for new referrals
CREATE TRIGGER on_referral_created_award_signup
  AFTER INSERT ON public.referrals
  FOR EACH ROW
  EXECUTE FUNCTION public.award_signup_milestone();

-- Function to check and award earnings milestones
CREATE OR REPLACE FUNCTION public.check_referral_earnings_milestones()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  ref_record RECORD;
  milestone RECORD;
  new_earnings numeric;
BEGIN
  -- Only check when total_earned increases
  IF NEW.total_earned IS NULL OR OLD.total_earned IS NULL OR NEW.total_earned <= OLD.total_earned THEN
    RETURN NEW;
  END IF;
  
  new_earnings := NEW.total_earned;
  
  -- Check if this user was referred by someone
  FOR ref_record IN 
    SELECT r.id as referral_id, r.referrer_id
    FROM public.referrals r
    WHERE r.referred_id = NEW.user_id
  LOOP
    -- Check each earnings milestone
    FOR milestone IN
      SELECT m.id, m.threshold, m.reward_amount
      FROM public.referral_milestones m
      WHERE m.milestone_type = 'earnings_reached'
        AND m.threshold <= new_earnings
        AND m.id NOT IN (
          SELECT milestone_id FROM public.referral_milestone_rewards 
          WHERE referral_id = ref_record.referral_id
        )
      ORDER BY m.threshold ASC
    LOOP
      -- Award this milestone
      INSERT INTO public.referral_milestone_rewards (referral_id, milestone_id, reward_amount)
      VALUES (ref_record.referral_id, milestone.id, milestone.reward_amount)
      ON CONFLICT (referral_id, milestone_id) DO NOTHING;
      
      -- Update referral record
      UPDATE public.referrals
      SET reward_earned = COALESCE(reward_earned, 0) + milestone.reward_amount
      WHERE id = ref_record.referral_id;
      
      -- Update referrer's profile
      UPDATE public.profiles
      SET referral_earnings = COALESCE(referral_earnings, 0) + milestone.reward_amount
      WHERE id = ref_record.referrer_id;
      
      -- Credit to referrer's wallet
      UPDATE public.wallets
      SET 
        balance = COALESCE(balance, 0) + milestone.reward_amount,
        total_earned = COALESCE(total_earned, 0) + milestone.reward_amount
      WHERE user_id = ref_record.referrer_id;
      
      -- Create transaction record
      INSERT INTO public.wallet_transactions (user_id, amount, type, description, metadata)
      VALUES (
        ref_record.referrer_id,
        milestone.reward_amount,
        'referral',
        'Referral earnings milestone: $' || milestone.threshold::text || ' reached',
        jsonb_build_object('referral_id', ref_record.referral_id, 'milestone_type', 'earnings_reached', 'threshold', milestone.threshold)
      );
    END LOOP;
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Trigger on wallet updates to check milestones
CREATE TRIGGER on_wallet_update_check_referral_milestones
  AFTER UPDATE ON public.wallets
  FOR EACH ROW
  EXECUTE FUNCTION public.check_referral_earnings_milestones();