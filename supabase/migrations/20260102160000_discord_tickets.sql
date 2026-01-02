-- Discord Ticket System Integration
-- Links Discord channels with web-based support tickets for bidirectional sync

-- 1. Discord ticket configuration per brand
CREATE TABLE IF NOT EXISTS discord_ticket_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  guild_id TEXT NOT NULL,
  panel_channel_id TEXT,
  panel_message_id TEXT,
  ticket_category_id TEXT,
  support_role_id TEXT,
  log_channel_id TEXT,
  welcome_message TEXT DEFAULT 'Thanks for creating a ticket! Our team will be with you shortly.',
  auto_close_hours INTEGER DEFAULT 72,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(brand_id),
  UNIQUE(guild_id)
);

-- Create index for guild lookup
CREATE INDEX IF NOT EXISTS idx_discord_ticket_config_guild ON discord_ticket_config(guild_id);

-- Trigger to update updated_at
CREATE TRIGGER update_discord_ticket_config_updated_at
  BEFORE UPDATE ON discord_ticket_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 2. Link Discord channels to support tickets
CREATE TABLE IF NOT EXISTS discord_ticket_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  channel_id TEXT NOT NULL UNIQUE,
  guild_id TEXT NOT NULL,
  discord_user_id TEXT NOT NULL,
  channel_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  UNIQUE(ticket_id)
);

-- Create indexes for channel lookups
CREATE INDEX IF NOT EXISTS idx_discord_ticket_channels_channel ON discord_ticket_channels(channel_id);
CREATE INDEX IF NOT EXISTS idx_discord_ticket_channels_guild ON discord_ticket_channels(guild_id);
CREATE INDEX IF NOT EXISTS idx_discord_ticket_channels_ticket ON discord_ticket_channels(ticket_id);

-- 3. Sync messages between Discord and web
CREATE TABLE IF NOT EXISTS discord_ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  ticket_message_id UUID REFERENCES ticket_messages(id) ON DELETE CASCADE,
  discord_message_id TEXT NOT NULL UNIQUE,
  channel_id TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('discord', 'web')),
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for message lookups
CREATE INDEX IF NOT EXISTS idx_discord_ticket_messages_ticket ON discord_ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_discord_ticket_messages_discord_id ON discord_ticket_messages(discord_message_id);
CREATE INDEX IF NOT EXISTS idx_discord_ticket_messages_ticket_msg ON discord_ticket_messages(ticket_message_id);

-- Enable RLS on all tables
ALTER TABLE discord_ticket_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE discord_ticket_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE discord_ticket_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for discord_ticket_config

-- Brand admins can view their config
CREATE POLICY "Brand admins can view their discord config"
  ON discord_ticket_config FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM brand_members
      WHERE brand_members.brand_id = discord_ticket_config.brand_id
      AND brand_members.user_id = auth.uid()
      AND brand_members.role IN ('owner', 'admin')
    )
  );

-- Brand owners can manage config
CREATE POLICY "Brand owners can manage discord config"
  ON discord_ticket_config FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM brand_members
      WHERE brand_members.brand_id = discord_ticket_config.brand_id
      AND brand_members.user_id = auth.uid()
      AND brand_members.role = 'owner'
    )
  );

-- System admins can manage all configs
CREATE POLICY "System admins can manage all discord configs"
  ON discord_ticket_config FOR ALL
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- RLS Policies for discord_ticket_channels

-- Users can view channels for their tickets
CREATE POLICY "Users can view their ticket channels"
  ON discord_ticket_channels FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM support_tickets
      WHERE support_tickets.id = discord_ticket_channels.ticket_id
      AND support_tickets.user_id = auth.uid()
    )
  );

-- Admins can view all channels
CREATE POLICY "Admins can view all ticket channels"
  ON discord_ticket_channels FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Service role can manage (for edge functions)
CREATE POLICY "Service can manage ticket channels"
  ON discord_ticket_channels FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- RLS Policies for discord_ticket_messages

-- Users can view message sync records for their tickets
CREATE POLICY "Users can view their message syncs"
  ON discord_ticket_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM support_tickets
      WHERE support_tickets.id = discord_ticket_messages.ticket_id
      AND support_tickets.user_id = auth.uid()
    )
  );

-- Admins can view all syncs
CREATE POLICY "Admins can view all message syncs"
  ON discord_ticket_messages FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Service role can manage (for edge functions)
CREATE POLICY "Service can manage message syncs"
  ON discord_ticket_messages FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Enable realtime for ticket channel updates
ALTER PUBLICATION supabase_realtime ADD TABLE discord_ticket_channels;

-- Add helper column to ticket_messages to track discord sync status
ALTER TABLE ticket_messages ADD COLUMN IF NOT EXISTS discord_synced BOOLEAN DEFAULT false;
