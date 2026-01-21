-- Waliet Database Schema
-- A platform that lets users complete tasks for money, created by businesses

-- =============================================================================
-- TYPES
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE app_role AS ENUM ('admin', 'user', 'business');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE payout_status AS ENUM ('pending', 'in_transit', 'completed', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- =============================================================================
-- TABLES
-- =============================================================================

-- 1. User Profiles
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  email TEXT,
  phone_number TEXT,
  country TEXT,
  city TEXT,
  total_earnings NUMERIC(10,2) DEFAULT 0,
  trust_score INTEGER DEFAULT 100 CHECK (trust_score >= 0 AND trust_score <= 100),
  account_type TEXT DEFAULT 'user' CHECK (account_type IN ('user', 'business')),

  -- Referral system
  referral_code TEXT UNIQUE,
  referred_by UUID REFERENCES profiles(id),
  total_referrals INTEGER DEFAULT 0,
  successful_referrals INTEGER DEFAULT 0,
  referral_earnings NUMERIC DEFAULT 0,

  -- Profile settings
  is_private BOOLEAN DEFAULT false,
  onboarding_completed BOOLEAN DEFAULT false,
  onboarding_step INTEGER DEFAULT 0,

  -- Skills and preferences
  skills TEXT[] DEFAULT '{}',
  interests TEXT[] DEFAULT '{}',

  -- Notification preferences
  notify_email_new_tasks BOOLEAN DEFAULT true,
  notify_email_transactions BOOLEAN DEFAULT true,
  notify_email_task_updates BOOLEAN DEFAULT true,
  notify_email_payout_status BOOLEAN DEFAULT true,

  -- Account status
  banned_at TIMESTAMPTZ,
  ban_reason TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. User Roles
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Businesses (Task Creators)
CREATE TABLE IF NOT EXISTS businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  description TEXT,
  website TEXT,

  -- Business details
  business_details JSONB DEFAULT '{}',
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,

  -- Subscription/Plan
  subscription_plan TEXT,
  subscription_status TEXT DEFAULT 'inactive',
  subscription_started_at TIMESTAMPTZ,
  subscription_expires_at TIMESTAMPTZ,

  -- Settings
  settings JSONB DEFAULT '{}',
  onboarding_completed BOOLEAN DEFAULT false,
  onboarding_step INTEGER DEFAULT 0,

  -- Notifications
  notify_new_application BOOLEAN DEFAULT true,
  notify_new_message BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Business Members
CREATE TABLE IF NOT EXISTS business_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(business_id, user_id)
);

-- 5. Tasks (Opportunities)
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  -- Basic info
  title TEXT NOT NULL,
  slug TEXT,
  description TEXT,
  requirements TEXT,

  -- Task details
  task_type TEXT DEFAULT 'one_time' CHECK (task_type IN ('one_time', 'recurring', 'ongoing')),
  category TEXT,
  tags TEXT[] DEFAULT '{}',
  skills_required TEXT[] DEFAULT '{}',

  -- Capacity
  max_participants INTEGER DEFAULT 0,
  current_participants INTEGER DEFAULT 0,

  -- Timeline
  start_date DATE,
  end_date DATE,
  deadline TIMESTAMPTZ,

  -- Payment
  reward_amount NUMERIC NOT NULL DEFAULT 0,
  payment_model TEXT DEFAULT 'fixed' CHECK (payment_model IN ('fixed', 'per_unit', 'hourly')),
  rate_min NUMERIC(10,2),
  rate_max NUMERIC(10,2),
  budget NUMERIC DEFAULT 0,
  budget_used NUMERIC DEFAULT 0,

  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'cancelled')),
  review_status TEXT DEFAULT 'draft' CHECK (review_status IN ('draft', 'pending_review', 'approved', 'rejected')),
  review_notes TEXT,
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,

  -- Application settings
  application_questions JSONB DEFAULT '[]',
  is_private BOOLEAN DEFAULT false,

  -- Banner/Media
  banner_url TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT valid_date_range CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date),
  CONSTRAINT valid_participant_count CHECK (current_participants >= 0 AND (max_participants = 0 OR current_participants <= max_participants))
);

-- 6. Task Applications
CREATE TABLE IF NOT EXISTS task_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Application content
  application_text TEXT,
  application_answers JSONB,

  -- Rate negotiation
  proposed_rate NUMERIC(10,2),
  approved_rate NUMERIC(10,2),
  rate_status TEXT DEFAULT 'pending' CHECK (rate_status IN ('pending', 'proposed', 'approved', 'countered')),

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn', 'completed')),

  -- Timestamps
  applied_at TIMESTAMPTZ DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES profiles(id),
  completed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(task_id, user_id)
);

-- 7. Task Submissions
CREATE TABLE IF NOT EXISTS task_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_application_id UUID NOT NULL REFERENCES task_applications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,

  -- Submission content
  submission_text TEXT,
  submission_url TEXT,
  attachments JSONB DEFAULT '[]',

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'revision_requested')),
  feedback TEXT,

  -- Review
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES profiles(id),

  -- Payment
  amount_earned NUMERIC(10,2) DEFAULT 0,
  paid_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Task Bookmarks
CREATE TABLE IF NOT EXISTS task_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, task_id)
);

-- 9. User Wallets
CREATE TABLE IF NOT EXISTS wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  balance NUMERIC(10,2) DEFAULT 0,
  total_earned NUMERIC(10,2) DEFAULT 0,
  total_withdrawn NUMERIC(10,2) DEFAULT 0,
  payout_method TEXT CHECK (payout_method IS NULL OR payout_method IN ('crypto', 'paypal', 'bank', 'wise', 'revolut')),
  payout_details JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 10. User Wallet Transactions
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('earning', 'withdrawal', 'referral', 'bonus', 'adjustment', 'transfer_sent', 'transfer_received')),
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'rejected')),
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 11. Business Wallets
CREATE TABLE IF NOT EXISTS business_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID UNIQUE NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  balance NUMERIC(10,2) DEFAULT 0,
  total_deposited NUMERIC(10,2) DEFAULT 0,
  total_spent NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 12. Business Wallet Transactions
CREATE TABLE IF NOT EXISTS business_wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'payment', 'refund', 'adjustment')),
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 13. Payout Requests
CREATE TABLE IF NOT EXISTS payout_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  net_amount NUMERIC,
  payout_method TEXT NOT NULL,
  payout_details JSONB NOT NULL,
  status payout_status DEFAULT 'pending',
  rejection_reason TEXT,
  processed_at TIMESTAMPTZ,
  processed_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 14. Referrals
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES profiles(id),
  referred_id UUID UNIQUE NOT NULL REFERENCES profiles(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rejected')),
  reward_amount NUMERIC DEFAULT 0,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 15. Support Tickets
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  category TEXT CHECK (category IN ('billing', 'technical', 'account', 'task', 'payout', 'other')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'awaiting_reply', 'resolved', 'closed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 16. Ticket Messages
CREATE TABLE IF NOT EXISTS ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id),
  sender_type TEXT DEFAULT 'user' CHECK (sender_type IN ('user', 'admin')),
  message TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON profiles(referred_by);

CREATE INDEX IF NOT EXISTS idx_businesses_slug ON businesses(slug);
CREATE INDEX IF NOT EXISTS idx_businesses_is_active ON businesses(is_active);

CREATE INDEX IF NOT EXISTS idx_business_members_business_id ON business_members(business_id);
CREATE INDEX IF NOT EXISTS idx_business_members_user_id ON business_members(user_id);

CREATE INDEX IF NOT EXISTS idx_tasks_business_id ON tasks(business_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks(category);
CREATE INDEX IF NOT EXISTS idx_tasks_slug ON tasks(slug);

CREATE INDEX IF NOT EXISTS idx_task_applications_task_id ON task_applications(task_id);
CREATE INDEX IF NOT EXISTS idx_task_applications_user_id ON task_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_task_applications_status ON task_applications(status);

CREATE INDEX IF NOT EXISTS idx_task_submissions_task_id ON task_submissions(task_id);
CREATE INDEX IF NOT EXISTS idx_task_submissions_user_id ON task_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_task_submissions_status ON task_submissions(status);

CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id ON wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_type ON wallet_transactions(type);

CREATE INDEX IF NOT EXISTS idx_business_wallets_business_id ON business_wallets(business_id);
CREATE INDEX IF NOT EXISTS idx_business_wallet_transactions_business_id ON business_wallet_transactions(business_id);

CREATE INDEX IF NOT EXISTS idx_payout_requests_user_id ON payout_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_payout_requests_status ON payout_requests(status);

CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);

CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket_id ON ticket_messages(ticket_id);

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Function to add earnings to wallet
CREATE OR REPLACE FUNCTION add_to_wallet(p_user_id UUID, p_amount NUMERIC)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  UPDATE wallets
  SET
    balance = balance + p_amount,
    total_earned = total_earned + p_amount,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    INSERT INTO wallets (user_id, balance, total_earned, total_withdrawn)
    VALUES (p_user_id, p_amount, p_amount, 0);
  END IF;
END;
$$;

-- Function to check if user has a role
CREATE OR REPLACE FUNCTION has_role(p_user_id UUID, p_role app_role)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = p_user_id AND role = p_role
  );
END;
$$;

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  random_username TEXT;
BEGIN
  -- Generate random username
  random_username := 'user_' || substr(md5(random()::text), 1, 8);

  -- Create profile
  INSERT INTO public.profiles (id, username, email)
  VALUES (NEW.id, random_username, NEW.email);

  -- Create wallet
  INSERT INTO public.wallets (user_id)
  VALUES (NEW.id);

  -- Assign default user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');

  RETURN NEW;
END;
$$;

-- Trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Apply updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_businesses_updated_at BEFORE UPDATE ON businesses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_task_applications_updated_at BEFORE UPDATE ON task_applications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_task_submissions_updated_at BEFORE UPDATE ON task_submissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON wallets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_wallet_transactions_updated_at BEFORE UPDATE ON wallet_transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_business_wallets_updated_at BEFORE UPDATE ON business_wallets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payout_requests_updated_at BEFORE UPDATE ON payout_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_support_tickets_updated_at BEFORE UPDATE ON support_tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_roles_updated_at BEFORE UPDATE ON user_roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- User roles policies
CREATE POLICY "Users can view own role" ON user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON user_roles FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Businesses policies
CREATE POLICY "Anyone can view active businesses" ON businesses FOR SELECT USING (is_active = true);
CREATE POLICY "Business members can update their business" ON businesses FOR UPDATE
  USING (EXISTS (SELECT 1 FROM business_members WHERE business_id = id AND user_id = auth.uid() AND role IN ('owner', 'admin')));

-- Business members policies
CREATE POLICY "Business members can view their memberships" ON business_members FOR SELECT
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM business_members bm WHERE bm.business_id = business_members.business_id AND bm.user_id = auth.uid()));

-- Tasks policies
CREATE POLICY "Anyone can view active public tasks" ON tasks FOR SELECT
  USING (status = 'active' AND is_private = false);
CREATE POLICY "Business members can manage their tasks" ON tasks FOR ALL
  USING (EXISTS (SELECT 1 FROM business_members WHERE business_id = tasks.business_id AND user_id = auth.uid()));

-- Task applications policies
CREATE POLICY "Users can view own applications" ON task_applications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create applications" ON task_applications FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Business can view applications for their tasks" ON task_applications FOR SELECT
  USING (EXISTS (SELECT 1 FROM tasks t JOIN business_members bm ON t.business_id = bm.business_id WHERE t.id = task_id AND bm.user_id = auth.uid()));

-- Task submissions policies
CREATE POLICY "Users can view own submissions" ON task_submissions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create submissions" ON task_submissions FOR INSERT WITH CHECK (user_id = auth.uid());

-- Task bookmarks policies
CREATE POLICY "Users can manage own bookmarks" ON task_bookmarks FOR ALL USING (user_id = auth.uid());

-- Wallets policies
CREATE POLICY "Users can view own wallet" ON wallets FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update own wallet payout settings" ON wallets FOR UPDATE USING (user_id = auth.uid());

-- Wallet transactions policies
CREATE POLICY "Users can view own transactions" ON wallet_transactions FOR SELECT USING (user_id = auth.uid());

-- Business wallets policies
CREATE POLICY "Business members can view their wallet" ON business_wallets FOR SELECT
  USING (EXISTS (SELECT 1 FROM business_members WHERE business_id = business_wallets.business_id AND user_id = auth.uid()));

-- Business wallet transactions policies
CREATE POLICY "Business members can view their transactions" ON business_wallet_transactions FOR SELECT
  USING (EXISTS (SELECT 1 FROM business_members WHERE business_id = business_wallet_transactions.business_id AND user_id = auth.uid()));

-- Payout requests policies
CREATE POLICY "Users can view own payout requests" ON payout_requests FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create payout requests" ON payout_requests FOR INSERT WITH CHECK (user_id = auth.uid());

-- Referrals policies
CREATE POLICY "Users can view referrals they made or received" ON referrals FOR SELECT
  USING (referrer_id = auth.uid() OR referred_id = auth.uid());

-- Support tickets policies
CREATE POLICY "Users can view own tickets" ON support_tickets FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create tickets" ON support_tickets FOR INSERT WITH CHECK (user_id = auth.uid());

-- Ticket messages policies
CREATE POLICY "Users can view messages for their tickets" ON ticket_messages FOR SELECT
  USING (EXISTS (SELECT 1 FROM support_tickets WHERE id = ticket_id AND user_id = auth.uid()));
CREATE POLICY "Users can send messages on their tickets" ON ticket_messages FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM support_tickets WHERE id = ticket_id AND user_id = auth.uid()));

-- =============================================================================
-- GRANTS
-- =============================================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =============================================================================
-- DONE
-- =============================================================================
