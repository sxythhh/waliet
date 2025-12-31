-- Discord Deep Integration
-- Phase 4: Bot commands, role sync, reaction tracking, membership tracking

-- Store Discord bot configuration per brand
CREATE TABLE public.discord_bot_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  bot_token TEXT, -- Encrypted bot token (stored in Vault in production)
  guild_id TEXT NOT NULL, -- Discord server ID
  is_active BOOLEAN NOT NULL DEFAULT false,
  command_prefix TEXT DEFAULT '/',
  stats_channel_id TEXT, -- Channel for bot responses
  log_channel_id TEXT, -- Channel for audit logs
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(brand_id, guild_id)
);

-- Role mappings for campaign membership
CREATE TABLE public.discord_role_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  guild_id TEXT NOT NULL,
  role_id TEXT NOT NULL, -- Discord role ID
  role_name TEXT NOT NULL,
  mapping_type TEXT NOT NULL CHECK (mapping_type IN (
    'campaign_member', -- User is in a specific campaign
    'boost_member', -- User is in a specific boost
    'earnings_tier', -- User reached an earnings threshold
    'creator_tier', -- User is in a specific creator tier
    'active_creator' -- User has submitted content recently
  )),
  -- Target references (only one should be set based on mapping_type)
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
  boost_id UUID REFERENCES public.bounty_campaigns(id) ON DELETE CASCADE,
  tier_id UUID REFERENCES public.creator_tiers(id) ON DELETE CASCADE,
  -- For earnings_tier: minimum earnings threshold
  min_earnings NUMERIC,
  -- For active_creator: days since last submission
  active_days INTEGER DEFAULT 30,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(guild_id, role_id)
);

-- Track which users have which Discord roles (for sync status)
CREATE TABLE public.discord_user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  discord_user_id TEXT NOT NULL,
  guild_id TEXT NOT NULL,
  role_id TEXT NOT NULL,
  synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sync_status TEXT NOT NULL DEFAULT 'synced' CHECK (sync_status IN ('synced', 'pending', 'failed')),
  error_message TEXT,
  UNIQUE(user_id, guild_id, role_id)
);

-- Track reaction sentiment on Discord messages
CREATE TABLE public.discord_reaction_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  guild_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  message_id TEXT NOT NULL,
  -- Reference to broadcast if this was a platform announcement
  broadcast_id UUID REFERENCES public.brand_broadcasts(id) ON DELETE SET NULL,
  message_preview TEXT, -- First 200 chars of the message
  -- Reaction counts (stored as JSONB for flexibility)
  reactions JSONB NOT NULL DEFAULT '{}', -- {"emoji": count, "emoji2": count}
  positive_count INTEGER NOT NULL DEFAULT 0,
  negative_count INTEGER NOT NULL DEFAULT 0,
  neutral_count INTEGER NOT NULL DEFAULT 0,
  total_reactions INTEGER NOT NULL DEFAULT 0,
  -- Sentiment score -1 to 1
  sentiment_score NUMERIC(3,2) DEFAULT 0,
  first_tracked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(message_id)
);

-- Track individual reactions for detailed analytics
CREATE TABLE public.discord_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tracking_id UUID NOT NULL REFERENCES public.discord_reaction_tracking(id) ON DELETE CASCADE,
  discord_user_id TEXT NOT NULL,
  emoji TEXT NOT NULL, -- Unicode emoji or custom emoji ID
  emoji_name TEXT, -- Name for custom emojis
  is_custom BOOLEAN NOT NULL DEFAULT false,
  sentiment TEXT CHECK (sentiment IN ('positive', 'negative', 'neutral')),
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  removed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(tracking_id, discord_user_id, emoji)
);

-- Track Discord membership changes
CREATE TABLE public.discord_membership_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  guild_id TEXT NOT NULL,
  discord_user_id TEXT NOT NULL,
  discord_username TEXT,
  discord_discriminator TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Linked platform user if known
  event_type TEXT NOT NULL CHECK (event_type IN (
    'member_join',
    'member_leave',
    'role_add',
    'role_remove',
    'nickname_change'
  )),
  role_id TEXT, -- For role_add/role_remove events
  role_name TEXT,
  old_value TEXT, -- For nickname_change
  new_value TEXT,
  event_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Link Discord users to platform users
CREATE TABLE public.discord_user_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  discord_user_id TEXT NOT NULL,
  discord_username TEXT NOT NULL,
  discord_discriminator TEXT,
  discord_avatar TEXT,
  linked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  verified BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(user_id),
  UNIQUE(discord_user_id)
);

-- Bot command log for analytics
CREATE TABLE public.discord_command_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  guild_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  discord_user_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  command TEXT NOT NULL,
  args TEXT,
  response_status TEXT CHECK (response_status IN ('success', 'error', 'unauthorized')),
  error_message TEXT,
  execution_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Define which emoji sentiments for reaction tracking
CREATE TABLE public.discord_emoji_sentiments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  emoji TEXT NOT NULL UNIQUE,
  emoji_name TEXT,
  sentiment TEXT NOT NULL CHECK (sentiment IN ('positive', 'negative', 'neutral')),
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default emoji sentiments
INSERT INTO public.discord_emoji_sentiments (emoji, emoji_name, sentiment, is_default) VALUES
  -- Positive
  ('👍', 'thumbsup', 'positive', true),
  ('❤️', 'heart', 'positive', true),
  ('🔥', 'fire', 'positive', true),
  ('⭐', 'star', 'positive', true),
  ('🎉', 'tada', 'positive', true),
  ('💯', '100', 'positive', true),
  ('✅', 'white_check_mark', 'positive', true),
  ('🙌', 'raised_hands', 'positive', true),
  ('💪', 'muscle', 'positive', true),
  ('👏', 'clap', 'positive', true),
  -- Negative
  ('👎', 'thumbsdown', 'negative', true),
  ('😢', 'cry', 'negative', true),
  ('😡', 'rage', 'negative', true),
  ('💔', 'broken_heart', 'negative', true),
  ('❌', 'x', 'negative', true),
  ('😤', 'triumph', 'negative', true),
  -- Neutral
  ('🤔', 'thinking', 'neutral', true),
  ('👀', 'eyes', 'neutral', true),
  ('❓', 'question', 'neutral', true),
  ('💬', 'speech_balloon', 'neutral', true);

-- Enable RLS
ALTER TABLE public.discord_bot_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discord_role_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discord_user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discord_reaction_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discord_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discord_membership_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discord_user_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discord_command_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discord_emoji_sentiments ENABLE ROW LEVEL SECURITY;

-- Policies for bot config
CREATE POLICY "Brand members can manage bot config"
ON public.discord_bot_config
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.brand_members
    WHERE brand_members.brand_id = discord_bot_config.brand_id
    AND brand_members.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.brand_members
    WHERE brand_members.brand_id = discord_bot_config.brand_id
    AND brand_members.user_id = auth.uid()
  )
);

-- Policies for role mappings
CREATE POLICY "Brand members can manage role mappings"
ON public.discord_role_mappings
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.brand_members
    WHERE brand_members.brand_id = discord_role_mappings.brand_id
    AND brand_members.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.brand_members
    WHERE brand_members.brand_id = discord_role_mappings.brand_id
    AND brand_members.user_id = auth.uid()
  )
);

-- Policies for user roles
CREATE POLICY "Brand members can view user roles"
ON public.discord_user_roles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.brand_members
    WHERE brand_members.brand_id = discord_user_roles.brand_id
    AND brand_members.user_id = auth.uid()
  )
);

CREATE POLICY "Users can view own roles"
ON public.discord_user_roles
FOR SELECT
USING (auth.uid() = user_id);

-- Policies for reaction tracking
CREATE POLICY "Brand members can view reactions"
ON public.discord_reaction_tracking
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.brand_members
    WHERE brand_members.brand_id = discord_reaction_tracking.brand_id
    AND brand_members.user_id = auth.uid()
  )
);

CREATE POLICY "Brand members can view individual reactions"
ON public.discord_reactions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.discord_reaction_tracking rt
    JOIN public.brand_members bm ON bm.brand_id = rt.brand_id
    WHERE rt.id = discord_reactions.tracking_id
    AND bm.user_id = auth.uid()
  )
);

-- Policies for membership log
CREATE POLICY "Brand members can view membership logs"
ON public.discord_membership_log
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.brand_members
    WHERE brand_members.brand_id = discord_membership_log.brand_id
    AND brand_members.user_id = auth.uid()
  )
);

-- Policies for user links
CREATE POLICY "Users can manage own Discord link"
ON public.discord_user_links
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Brand members can view Discord links"
ON public.discord_user_links
FOR SELECT
USING (true); -- Brands need to see links for role sync

-- Policies for command log
CREATE POLICY "Brand members can view command logs"
ON public.discord_command_log
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.brand_members
    WHERE brand_members.brand_id = discord_command_log.brand_id
    AND brand_members.user_id = auth.uid()
  )
);

-- Policies for emoji sentiments (public read)
CREATE POLICY "Anyone can read emoji sentiments"
ON public.discord_emoji_sentiments
FOR SELECT
USING (true);

-- System policies for server-side operations
CREATE POLICY "System can manage bot config"
ON public.discord_bot_config FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "System can manage user roles"
ON public.discord_user_roles FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "System can manage reaction tracking"
ON public.discord_reaction_tracking FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "System can manage reactions"
ON public.discord_reactions FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "System can manage membership log"
ON public.discord_membership_log FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "System can manage command log"
ON public.discord_command_log FOR ALL USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX discord_bot_config_brand_idx ON public.discord_bot_config(brand_id);
CREATE INDEX discord_bot_config_guild_idx ON public.discord_bot_config(guild_id);
CREATE INDEX discord_role_mappings_brand_idx ON public.discord_role_mappings(brand_id);
CREATE INDEX discord_role_mappings_guild_idx ON public.discord_role_mappings(guild_id);
CREATE INDEX discord_user_roles_user_idx ON public.discord_user_roles(user_id);
CREATE INDEX discord_user_roles_discord_user_idx ON public.discord_user_roles(discord_user_id);
CREATE INDEX discord_reaction_tracking_brand_idx ON public.discord_reaction_tracking(brand_id);
CREATE INDEX discord_reaction_tracking_message_idx ON public.discord_reaction_tracking(message_id);
CREATE INDEX discord_reactions_tracking_idx ON public.discord_reactions(tracking_id);
CREATE INDEX discord_membership_log_brand_idx ON public.discord_membership_log(brand_id);
CREATE INDEX discord_membership_log_discord_user_idx ON public.discord_membership_log(discord_user_id);
CREATE INDEX discord_membership_log_event_idx ON public.discord_membership_log(event_type);
CREATE INDEX discord_user_links_discord_idx ON public.discord_user_links(discord_user_id);
CREATE INDEX discord_command_log_brand_idx ON public.discord_command_log(brand_id);
CREATE INDEX discord_command_log_user_idx ON public.discord_command_log(discord_user_id);

-- Trigger to update timestamps
CREATE OR REPLACE FUNCTION public.update_discord_bot_config_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_discord_bot_config_timestamp
BEFORE UPDATE ON public.discord_bot_config
FOR EACH ROW EXECUTE FUNCTION public.update_discord_bot_config_timestamp();

-- Function to calculate sentiment score from reactions
CREATE OR REPLACE FUNCTION public.calculate_reaction_sentiment(
  p_positive INTEGER,
  p_negative INTEGER,
  p_total INTEGER
) RETURNS NUMERIC AS $$
BEGIN
  IF p_total = 0 THEN
    RETURN 0;
  END IF;
  -- Score from -1 (all negative) to 1 (all positive)
  RETURN ROUND(((p_positive - p_negative)::NUMERIC / p_total), 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;
