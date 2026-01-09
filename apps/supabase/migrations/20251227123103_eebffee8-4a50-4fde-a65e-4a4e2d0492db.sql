-- Add XP columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS current_xp INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_level INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS current_rank TEXT DEFAULT 'Bronze';

-- Create xp_transactions table for tracking XP history
CREATE TABLE public.xp_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  source_type TEXT NOT NULL,
  source_id UUID,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on xp_transactions
ALTER TABLE public.xp_transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for xp_transactions
CREATE POLICY "Users can view their own XP transactions"
ON public.xp_transactions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can insert XP transactions"
ON public.xp_transactions FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create level_thresholds table
CREATE TABLE public.level_thresholds (
  level INTEGER PRIMARY KEY,
  rank TEXT NOT NULL,
  xp_required INTEGER NOT NULL
);

-- Enable RLS on level_thresholds (public read)
ALTER TABLE public.level_thresholds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view level thresholds"
ON public.level_thresholds FOR SELECT
USING (true);

-- Insert level thresholds data
INSERT INTO public.level_thresholds (level, rank, xp_required) VALUES
(1, 'Bronze', 0),
(2, 'Bronze', 500),
(3, 'Bronze', 1200),
(4, 'Bronze', 2500),
(5, 'Bronze', 4500),
(6, 'Silver', 6000),
(7, 'Silver', 8000),
(8, 'Silver', 10500),
(9, 'Silver', 13500),
(10, 'Silver', 17000),
(11, 'Gold', 21000),
(12, 'Gold', 26000),
(13, 'Gold', 32000),
(14, 'Gold', 40000),
(15, 'Gold', 50000),
(16, 'Gold', 62000),
(17, 'Gold', 76000),
(18, 'Gold', 92000),
(19, 'Gold', 110000),
(20, 'Gold', 130000),
(21, 'Platinum', 150000),
(22, 'Platinum', 175000),
(23, 'Platinum', 205000),
(24, 'Platinum', 240000),
(25, 'Platinum', 280000),
(26, 'Platinum', 325000),
(27, 'Platinum', 375000),
(28, 'Platinum', 430000),
(29, 'Platinum', 490000),
(30, 'Platinum', 555000),
(31, 'Platinum', 625000),
(32, 'Platinum', 700000),
(33, 'Platinum', 780000),
(34, 'Platinum', 865000),
(35, 'Platinum', 955000),
(36, 'Platinum', 1050000),
(37, 'Platinum', 1150000),
(38, 'Platinum', 1255000),
(39, 'Platinum', 1365000),
(40, 'Platinum', 1480000),
(41, 'Elite', 1600000),
(42, 'Elite', 1750000),
(43, 'Elite', 1925000),
(44, 'Elite', 2125000),
(45, 'Elite', 2350000),
(46, 'Elite', 2600000),
(47, 'Elite', 2875000),
(48, 'Elite', 3175000),
(49, 'Elite', 3500000),
(50, 'Elite', 3850000);

-- Create function to calculate level and rank from XP
CREATE OR REPLACE FUNCTION public.get_level_from_xp(xp INTEGER)
RETURNS TABLE(level INTEGER, rank TEXT, xp_for_next_level INTEGER) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    lt.level,
    lt.rank,
    COALESCE(
      (SELECT xp_required FROM public.level_thresholds WHERE level_thresholds.level = lt.level + 1),
      lt.xp_required + 500000
    ) AS xp_for_next_level
  FROM public.level_thresholds lt
  WHERE lt.xp_required <= xp
  ORDER BY lt.level DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create function to update profile XP, level, and rank
CREATE OR REPLACE FUNCTION public.update_profile_xp()
RETURNS TRIGGER AS $$
DECLARE
  new_xp INTEGER;
  level_info RECORD;
BEGIN
  -- Calculate new total XP
  SELECT COALESCE(SUM(amount), 0) INTO new_xp
  FROM public.xp_transactions
  WHERE user_id = NEW.user_id;
  
  -- Ensure XP doesn't go negative
  IF new_xp < 0 THEN
    new_xp := 0;
  END IF;
  
  -- Get level and rank from XP
  SELECT * INTO level_info FROM public.get_level_from_xp(new_xp);
  
  -- Update profile
  UPDATE public.profiles
  SET 
    current_xp = new_xp,
    current_level = COALESCE(level_info.level, 1),
    current_rank = COALESCE(level_info.rank, 'Bronze')
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to update profile when XP transaction is added
CREATE TRIGGER on_xp_transaction_insert
AFTER INSERT ON public.xp_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_profile_xp();

-- Create function to award XP from wallet transactions (10 XP per $1)
CREATE OR REPLACE FUNCTION public.award_xp_from_earning()
RETURNS TRIGGER AS $$
BEGIN
  -- Only award XP for earning type transactions
  IF NEW.type = 'earning' AND NEW.amount > 0 THEN
    INSERT INTO public.xp_transactions (user_id, amount, source_type, source_id, description)
    VALUES (
      NEW.user_id,
      FLOOR(NEW.amount * 10)::INTEGER,
      'earning',
      NEW.id,
      'XP from earnings: $' || NEW.amount
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for wallet transactions
CREATE TRIGGER on_wallet_transaction_earning
AFTER INSERT ON public.wallet_transactions
FOR EACH ROW
EXECUTE FUNCTION public.award_xp_from_earning();

-- Create function to award XP for campaign/boost joins (100 XP)
CREATE OR REPLACE FUNCTION public.award_xp_from_submission()
RETURNS TRIGGER AS $$
BEGIN
  -- Award 100 XP when a submission is approved
  IF NEW.status = 'approved' AND (OLD IS NULL OR OLD.status != 'approved') THEN
    INSERT INTO public.xp_transactions (user_id, amount, source_type, source_id, description)
    VALUES (
      NEW.creator_id,
      100,
      'campaign_join',
      NEW.id,
      'XP from joining campaign'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for campaign submissions
CREATE TRIGGER on_campaign_submission_approved
AFTER INSERT OR UPDATE ON public.campaign_submissions
FOR EACH ROW
EXECUTE FUNCTION public.award_xp_from_submission();

-- Create function to award XP for video submissions (100 XP)
CREATE OR REPLACE FUNCTION public.award_xp_from_video_submission()
RETURNS TRIGGER AS $$
BEGIN
  -- Award 100 XP when a video submission is approved
  IF NEW.status = 'approved' AND (OLD IS NULL OR OLD.status != 'approved') THEN
    INSERT INTO public.xp_transactions (user_id, amount, source_type, source_id, description)
    VALUES (
      NEW.creator_id,
      100,
      'video_submission',
      NEW.id,
      'XP from video submission approved'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for video submissions
CREATE TRIGGER on_video_submission_approved
AFTER INSERT OR UPDATE ON public.video_submissions
FOR EACH ROW
EXECUTE FUNCTION public.award_xp_from_video_submission();

-- Create function to award XP for boost completion (1000 XP)
CREATE OR REPLACE FUNCTION public.award_xp_from_boost_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- Award 1000 XP when a bounty application status becomes 'completed'
  IF NEW.status = 'completed' AND (OLD IS NULL OR OLD.status != 'completed') THEN
    INSERT INTO public.xp_transactions (user_id, amount, source_type, source_id, description)
    VALUES (
      NEW.user_id,
      1000,
      'boost_completed',
      NEW.id,
      'XP from completing boost full term'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for bounty applications
CREATE TRIGGER on_bounty_application_completed
AFTER INSERT OR UPDATE ON public.bounty_applications
FOR EACH ROW
EXECUTE FUNCTION public.award_xp_from_boost_completion();

-- Create index for faster XP queries
CREATE INDEX IF NOT EXISTS idx_xp_transactions_user_id ON public.xp_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_created_at ON public.xp_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_profiles_current_xp ON public.profiles(current_xp DESC);