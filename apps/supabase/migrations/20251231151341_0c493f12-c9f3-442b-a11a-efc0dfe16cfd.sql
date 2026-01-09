-- ============================================
-- Missing Tables - Part 1: Core Tables
-- ============================================

-- Banned devices table
CREATE TABLE IF NOT EXISTS banned_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fingerprint_id TEXT NOT NULL,
  ip_address INET,
  creator_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ban_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  UNIQUE(fingerprint_id)
);

-- Milestone configs
CREATE TABLE IF NOT EXISTS milestone_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  boost_id UUID REFERENCES bounty_campaigns(id) ON DELETE CASCADE,
  milestone_type TEXT NOT NULL CHECK (milestone_type IN ('views', 'earnings', 'submissions')),
  threshold NUMERIC NOT NULL,
  message_template TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Milestone achievements
CREATE TABLE IF NOT EXISTS milestone_achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  milestone_config_id UUID NOT NULL REFERENCES milestone_configs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  boost_id UUID REFERENCES bounty_campaigns(id) ON DELETE CASCADE,
  achieved_value NUMERIC NOT NULL,
  achieved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notification_sent BOOLEAN NOT NULL DEFAULT false
);

-- Low balance alerts
CREATE TABLE IF NOT EXISTS low_balance_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('notify', 'pause_payouts', 'pause_campaign', 'auto_topup')),
  balance_at_alert NUMERIC NOT NULL,
  threshold_value NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT
);

-- Creator tiers
CREATE TABLE IF NOT EXISTS creator_tiers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  tier_order INTEGER NOT NULL,
  rpm_multiplier NUMERIC NOT NULL DEFAULT 1.0,
  color TEXT,
  icon TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(brand_id, name)
);

-- Tier promotion rules
CREATE TABLE IF NOT EXISTS tier_promotion_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  from_tier_id UUID REFERENCES creator_tiers(id) ON DELETE CASCADE,
  to_tier_id UUID NOT NULL REFERENCES creator_tiers(id) ON DELETE CASCADE,
  rule_type TEXT NOT NULL,
  threshold_value NUMERIC NOT NULL,
  evaluation_period_days INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Creator tier assignments
CREATE TABLE IF NOT EXISTS creator_tier_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  tier_id UUID NOT NULL REFERENCES creator_tiers(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  assigned_by TEXT,
  previous_tier_id UUID REFERENCES creator_tiers(id) ON DELETE SET NULL,
  UNIQUE(brand_id, user_id)
);

-- Tier change log
CREATE TABLE IF NOT EXISTS tier_change_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  from_tier_id UUID REFERENCES creator_tiers(id) ON DELETE SET NULL,
  to_tier_id UUID NOT NULL REFERENCES creator_tiers(id) ON DELETE CASCADE,
  change_type TEXT NOT NULL,
  rule_id UUID REFERENCES tier_promotion_rules(id) ON DELETE SET NULL,
  metrics_snapshot JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- Missing Tables - Part 2: Discord Integration
-- ============================================

CREATE TABLE IF NOT EXISTS discord_bot_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  bot_token TEXT,
  guild_id TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  command_prefix TEXT DEFAULT '/',
  stats_channel_id TEXT,
  log_channel_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(brand_id, guild_id)
);

CREATE TABLE IF NOT EXISTS discord_role_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  guild_id TEXT NOT NULL,
  role_id TEXT NOT NULL,
  role_name TEXT NOT NULL,
  mapping_type TEXT NOT NULL,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  boost_id UUID REFERENCES bounty_campaigns(id) ON DELETE CASCADE,
  tier_id UUID REFERENCES creator_tiers(id) ON DELETE CASCADE,
  min_earnings NUMERIC,
  active_days INTEGER DEFAULT 30,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(guild_id, role_id)
);

CREATE TABLE IF NOT EXISTS discord_user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  discord_user_id TEXT NOT NULL,
  guild_id TEXT NOT NULL,
  role_id TEXT NOT NULL,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sync_status TEXT NOT NULL DEFAULT 'synced',
  error_message TEXT,
  UNIQUE(user_id, guild_id, role_id)
);

CREATE TABLE IF NOT EXISTS discord_reaction_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  guild_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  message_id TEXT NOT NULL,
  broadcast_id UUID REFERENCES brand_broadcasts(id) ON DELETE SET NULL,
  message_preview TEXT,
  reactions JSONB NOT NULL DEFAULT '{}',
  positive_count INTEGER NOT NULL DEFAULT 0,
  negative_count INTEGER NOT NULL DEFAULT 0,
  neutral_count INTEGER NOT NULL DEFAULT 0,
  total_reactions INTEGER NOT NULL DEFAULT 0,
  sentiment_score NUMERIC(3,2) DEFAULT 0,
  first_tracked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(message_id)
);

CREATE TABLE IF NOT EXISTS discord_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tracking_id UUID NOT NULL REFERENCES discord_reaction_tracking(id) ON DELETE CASCADE,
  discord_user_id TEXT NOT NULL,
  emoji TEXT NOT NULL,
  emoji_name TEXT,
  is_custom BOOLEAN NOT NULL DEFAULT false,
  sentiment TEXT,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  removed_at TIMESTAMPTZ,
  UNIQUE(tracking_id, discord_user_id, emoji)
);

CREATE TABLE IF NOT EXISTS discord_membership_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  guild_id TEXT NOT NULL,
  discord_user_id TEXT NOT NULL,
  discord_username TEXT,
  discord_discriminator TEXT,
  user_id UUID,
  event_type TEXT NOT NULL,
  role_id TEXT,
  role_name TEXT,
  old_value TEXT,
  new_value TEXT,
  event_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS discord_user_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  discord_user_id TEXT NOT NULL,
  discord_username TEXT NOT NULL,
  discord_discriminator TEXT,
  discord_avatar TEXT,
  linked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  verified BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(user_id),
  UNIQUE(discord_user_id)
);

CREATE TABLE IF NOT EXISTS discord_command_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  guild_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  discord_user_id TEXT NOT NULL,
  user_id UUID,
  command TEXT NOT NULL,
  args TEXT,
  response_status TEXT,
  error_message TEXT,
  execution_time_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS discord_emoji_sentiments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  emoji TEXT NOT NULL UNIQUE,
  emoji_name TEXT,
  sentiment TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- Missing Tables - Part 3: Strike System
-- ============================================

CREATE TABLE IF NOT EXISTS creator_strikes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  contract_id UUID REFERENCES creator_contracts(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  boost_id UUID REFERENCES bounty_campaigns(id) ON DELETE SET NULL,
  strike_type TEXT NOT NULL,
  reason TEXT,
  scheduled_date DATE,
  severity INTEGER DEFAULT 1,
  is_appealed BOOLEAN DEFAULT FALSE,
  appeal_reason TEXT,
  appeal_status TEXT,
  appeal_reviewed_at TIMESTAMPTZ,
  appeal_reviewed_by UUID REFERENCES profiles(id),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

CREATE TABLE IF NOT EXISTS creator_reliability_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  total_strikes INTEGER DEFAULT 0,
  active_strikes INTEGER DEFAULT 0,
  total_scheduled INTEGER DEFAULT 0,
  total_delivered INTEGER DEFAULT 0,
  on_time_rate DECIMAL(5,2) DEFAULT 100.00,
  reliability_score INTEGER DEFAULT 100,
  last_strike_at TIMESTAMPTZ,
  last_calculated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(brand_id, creator_id)
);

CREATE TABLE IF NOT EXISTS content_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  contract_id UUID REFERENCES creator_contracts(id) ON DELETE SET NULL,
  boost_id UUID REFERENCES bounty_campaigns(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  scheduled_date DATE NOT NULL,
  scheduled_time TIME,
  platform TEXT,
  status TEXT DEFAULT 'proposed',
  proposed_by TEXT,
  confirmed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  submission_id UUID,
  reminder_sent BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS content_slot_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id UUID NOT NULL REFERENCES content_slots(id) ON DELETE CASCADE,
  changed_by UUID REFERENCES profiles(id),
  change_type TEXT NOT NULL,
  old_date DATE,
  new_date DATE,
  old_status TEXT,
  new_status TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS strike_thresholds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  threshold_name TEXT NOT NULL,
  strike_count INTEGER NOT NULL,
  action_type TEXT NOT NULL,
  notification_template TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(brand_id, threshold_name)
);

-- ============================================
-- Missing Tables - Part 4: Contract Templates
-- ============================================

CREATE TABLE IF NOT EXISTS contract_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  content TEXT NOT NULL,
  default_monthly_rate DECIMAL(10,2),
  default_videos_per_month INTEGER,
  default_duration_months INTEGER DEFAULT 12,
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

CREATE TABLE IF NOT EXISTS contract_template_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES contract_templates(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_required BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contract_template_variables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES contract_templates(id) ON DELETE CASCADE,
  variable_key TEXT NOT NULL,
  variable_label TEXT NOT NULL,
  variable_type TEXT DEFAULT 'text',
  default_value TEXT,
  options TEXT[],
  is_required BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Missing Tables - Part 5: Additional Tables
-- ============================================

CREATE TABLE IF NOT EXISTS campaign_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status TEXT DEFAULT 'active',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(campaign_id, user_id)
);

CREATE TABLE IF NOT EXISTS demographic_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  score NUMERIC DEFAULT 0,
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ============================================
-- Missing Column Alterations
-- ============================================

-- Profile extensions for fraud
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS fraud_flag_permanent BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS fraud_flag_count INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_fraud_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS banned_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ban_reason TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS device_fingerprint TEXT;

-- Brand fraud/balance settings
ALTER TABLE brands ADD COLUMN IF NOT EXISTS fraud_sensitivity TEXT DEFAULT 'normal';
ALTER TABLE brands ADD COLUMN IF NOT EXISTS notify_creator_fraud BOOLEAN DEFAULT false;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS low_balance_notify_threshold NUMERIC DEFAULT 1000;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS low_balance_pause_payouts_threshold NUMERIC DEFAULT 500;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS low_balance_pause_campaign_threshold NUMERIC DEFAULT 100;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS low_balance_auto_topup_enabled BOOLEAN DEFAULT false;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS low_balance_auto_topup_amount NUMERIC DEFAULT 1000;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS low_balance_last_notified_at TIMESTAMPTZ;

-- Payout request extensions
ALTER TABLE submission_payout_requests ADD COLUMN IF NOT EXISTS evidence_requested_at TIMESTAMPTZ;
ALTER TABLE submission_payout_requests ADD COLUMN IF NOT EXISTS evidence_deadline TIMESTAMPTZ;
ALTER TABLE submission_payout_requests ADD COLUMN IF NOT EXISTS views_snapshot JSONB DEFAULT '{}';
ALTER TABLE submission_payout_requests ADD COLUMN IF NOT EXISTS fraud_check_result JSONB DEFAULT '{}';
ALTER TABLE submission_payout_requests ADD COLUMN IF NOT EXISTS appeal_submitted_at TIMESTAMPTZ;
ALTER TABLE submission_payout_requests ADD COLUMN IF NOT EXISTS appeal_evidence_id UUID;
ALTER TABLE submission_payout_requests ADD COLUMN IF NOT EXISTS appeal_status TEXT;
ALTER TABLE submission_payout_requests ADD COLUMN IF NOT EXISTS appeal_resolved_at TIMESTAMPTZ;
ALTER TABLE submission_payout_requests ADD COLUMN IF NOT EXISTS appeal_resolved_by UUID;
ALTER TABLE submission_payout_requests ADD COLUMN IF NOT EXISTS reviewed_by UUID;
ALTER TABLE submission_payout_requests ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

-- Brand broadcasts
ALTER TABLE brand_broadcasts ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ;
ALTER TABLE brand_broadcasts ADD COLUMN IF NOT EXISTS target_type TEXT DEFAULT 'all';

-- Auto rejection rules
ALTER TABLE auto_rejection_rules ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE;
ALTER TABLE auto_rejection_rules ADD COLUMN IF NOT EXISTS rule_value TEXT;
ALTER TABLE auto_rejection_rules ADD COLUMN IF NOT EXISTS rejection_message TEXT DEFAULT 'Submission rejected';

-- Auto rejection log
ALTER TABLE auto_rejection_log ADD COLUMN IF NOT EXISTS submission_type TEXT DEFAULT 'campaign';
ALTER TABLE auto_rejection_log ADD COLUMN IF NOT EXISTS video_url TEXT;

-- Creator contracts template
ALTER TABLE creator_contracts ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES contract_templates(id) ON DELETE SET NULL;

-- ============================================
-- Enable RLS on all new tables
-- ============================================

ALTER TABLE banned_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestone_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestone_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE low_balance_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE tier_promotion_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_tier_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tier_change_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE discord_bot_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE discord_role_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE discord_user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE discord_reaction_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE discord_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE discord_membership_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE discord_user_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE discord_command_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE discord_emoji_sentiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_strikes ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_reliability_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_slot_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE strike_thresholds ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_template_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_template_variables ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE demographic_scores ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS Policies
-- ============================================

CREATE POLICY "Admin only banned_devices" ON banned_devices FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Brand members milestone_configs" ON milestone_configs FOR ALL USING (
  EXISTS (SELECT 1 FROM brand_members WHERE brand_id = milestone_configs.brand_id AND user_id = auth.uid())
);

CREATE POLICY "Users milestone_achievements" ON milestone_achievements FOR SELECT USING (
  user_id = auth.uid()
);

CREATE POLICY "Brand members low_balance_alerts" ON low_balance_alerts FOR ALL USING (
  EXISTS (SELECT 1 FROM brand_members WHERE brand_id = low_balance_alerts.brand_id AND user_id = auth.uid())
);

CREATE POLICY "Brand members creator_tiers" ON creator_tiers FOR ALL USING (
  EXISTS (SELECT 1 FROM brand_members WHERE brand_id = creator_tiers.brand_id AND user_id = auth.uid())
);

CREATE POLICY "Brand members tier_promotion_rules" ON tier_promotion_rules FOR ALL USING (
  EXISTS (SELECT 1 FROM brand_members WHERE brand_id = tier_promotion_rules.brand_id AND user_id = auth.uid())
);

CREATE POLICY "Brand members creator_tier_assignments" ON creator_tier_assignments FOR ALL USING (
  EXISTS (SELECT 1 FROM brand_members WHERE brand_id = creator_tier_assignments.brand_id AND user_id = auth.uid())
  OR user_id = auth.uid()
);

CREATE POLICY "Brand members tier_change_log" ON tier_change_log FOR SELECT USING (
  EXISTS (SELECT 1 FROM brand_members WHERE brand_id = tier_change_log.brand_id AND user_id = auth.uid())
  OR user_id = auth.uid()
);

CREATE POLICY "Brand members discord_bot_config" ON discord_bot_config FOR ALL USING (
  EXISTS (SELECT 1 FROM brand_members WHERE brand_id = discord_bot_config.brand_id AND user_id = auth.uid())
);

CREATE POLICY "Brand members discord_role_mappings" ON discord_role_mappings FOR ALL USING (
  EXISTS (SELECT 1 FROM brand_members WHERE brand_id = discord_role_mappings.brand_id AND user_id = auth.uid())
);

CREATE POLICY "Users discord_user_roles" ON discord_user_roles FOR SELECT USING (
  user_id = auth.uid() OR EXISTS (SELECT 1 FROM brand_members WHERE brand_id = discord_user_roles.brand_id AND user_id = auth.uid())
);

CREATE POLICY "Brand members discord_reaction_tracking" ON discord_reaction_tracking FOR SELECT USING (
  EXISTS (SELECT 1 FROM brand_members WHERE brand_id = discord_reaction_tracking.brand_id AND user_id = auth.uid())
);

CREATE POLICY "Brand members discord_reactions" ON discord_reactions FOR SELECT USING (
  EXISTS (SELECT 1 FROM discord_reaction_tracking drt JOIN brand_members bm ON bm.brand_id = drt.brand_id WHERE drt.id = discord_reactions.tracking_id AND bm.user_id = auth.uid())
);

CREATE POLICY "Brand members discord_membership_log" ON discord_membership_log FOR SELECT USING (
  EXISTS (SELECT 1 FROM brand_members WHERE brand_id = discord_membership_log.brand_id AND user_id = auth.uid())
);

CREATE POLICY "Users discord_user_links" ON discord_user_links FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Brand members discord_command_log" ON discord_command_log FOR SELECT USING (
  EXISTS (SELECT 1 FROM brand_members WHERE brand_id = discord_command_log.brand_id AND user_id = auth.uid())
);

CREATE POLICY "Anyone discord_emoji_sentiments" ON discord_emoji_sentiments FOR SELECT USING (true);

CREATE POLICY "Brand members creator_strikes" ON creator_strikes FOR ALL USING (
  EXISTS (SELECT 1 FROM brand_members WHERE brand_id = creator_strikes.brand_id AND user_id = auth.uid())
  OR creator_id = auth.uid()
);

CREATE POLICY "Brand members creator_reliability_scores" ON creator_reliability_scores FOR ALL USING (
  EXISTS (SELECT 1 FROM brand_members WHERE brand_id = creator_reliability_scores.brand_id AND user_id = auth.uid())
  OR creator_id = auth.uid()
);

CREATE POLICY "Brand members content_slots" ON content_slots FOR ALL USING (
  EXISTS (SELECT 1 FROM brand_members WHERE brand_id = content_slots.brand_id AND user_id = auth.uid())
  OR creator_id = auth.uid()
);

CREATE POLICY "Users content_slot_history" ON content_slot_history FOR SELECT USING (
  EXISTS (SELECT 1 FROM content_slots cs JOIN brand_members bm ON bm.brand_id = cs.brand_id WHERE cs.id = content_slot_history.slot_id AND bm.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM content_slots WHERE id = content_slot_history.slot_id AND creator_id = auth.uid())
);

CREATE POLICY "Brand members strike_thresholds" ON strike_thresholds FOR ALL USING (
  EXISTS (SELECT 1 FROM brand_members WHERE brand_id = strike_thresholds.brand_id AND user_id = auth.uid())
);

CREATE POLICY "Brand members contract_templates" ON contract_templates FOR ALL USING (
  EXISTS (SELECT 1 FROM brand_members WHERE brand_id = contract_templates.brand_id AND user_id = auth.uid())
);

CREATE POLICY "Brand members contract_template_sections" ON contract_template_sections FOR ALL USING (
  EXISTS (SELECT 1 FROM contract_templates ct JOIN brand_members bm ON bm.brand_id = ct.brand_id WHERE ct.id = contract_template_sections.template_id AND bm.user_id = auth.uid())
);

CREATE POLICY "Brand members contract_template_variables" ON contract_template_variables FOR ALL USING (
  EXISTS (SELECT 1 FROM contract_templates ct JOIN brand_members bm ON bm.brand_id = ct.brand_id WHERE ct.id = contract_template_variables.template_id AND bm.user_id = auth.uid())
);

CREATE POLICY "Campaign participants access" ON campaign_participants FOR ALL USING (
  user_id = auth.uid() OR EXISTS (SELECT 1 FROM campaigns c JOIN brand_members bm ON bm.brand_id = c.brand_id WHERE c.id = campaign_participants.campaign_id AND bm.user_id = auth.uid())
);

CREATE POLICY "Users demographic_scores" ON demographic_scores FOR SELECT USING (user_id = auth.uid());

-- Function to increment template usage
CREATE OR REPLACE FUNCTION increment_template_usage(template_id_param UUID)
RETURNS void AS $$
BEGIN
  UPDATE contract_templates
  SET usage_count = usage_count + 1
  WHERE id = template_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;