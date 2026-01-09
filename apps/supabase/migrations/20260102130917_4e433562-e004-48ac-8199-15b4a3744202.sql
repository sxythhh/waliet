-- Add missing columns to discord_ticket_config
ALTER TABLE public.discord_ticket_config ADD COLUMN IF NOT EXISTS panel_channel_id TEXT;
ALTER TABLE public.discord_ticket_config ADD COLUMN IF NOT EXISTS panel_message_id TEXT;
ALTER TABLE public.discord_ticket_config ADD COLUMN IF NOT EXISTS ticket_category_id TEXT;
ALTER TABLE public.discord_ticket_config ADD COLUMN IF NOT EXISTS log_channel_id TEXT;

-- Drop old category_id if exists and rename to ticket_category_id
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'discord_ticket_config' AND column_name = 'category_id') THEN
    ALTER TABLE public.discord_ticket_config DROP COLUMN category_id;
  END IF;
END $$;

-- Create discord_ticket_channels table
CREATE TABLE IF NOT EXISTS public.discord_ticket_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  channel_id TEXT NOT NULL UNIQUE,
  guild_id TEXT NOT NULL,
  discord_user_id TEXT NOT NULL,
  channel_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  UNIQUE(ticket_id)
);

-- Create indexes for channel lookups
CREATE INDEX IF NOT EXISTS idx_discord_ticket_channels_channel ON public.discord_ticket_channels(channel_id);
CREATE INDEX IF NOT EXISTS idx_discord_ticket_channels_guild ON public.discord_ticket_channels(guild_id);
CREATE INDEX IF NOT EXISTS idx_discord_ticket_channels_ticket ON public.discord_ticket_channels(ticket_id);

-- Create discord_ticket_messages table
CREATE TABLE IF NOT EXISTS public.discord_ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  ticket_message_id UUID REFERENCES public.ticket_messages(id) ON DELETE CASCADE,
  discord_message_id TEXT NOT NULL UNIQUE,
  channel_id TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('discord', 'web')),
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for message lookups
CREATE INDEX IF NOT EXISTS idx_discord_ticket_messages_ticket ON public.discord_ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_discord_ticket_messages_discord_id ON public.discord_ticket_messages(discord_message_id);
CREATE INDEX IF NOT EXISTS idx_discord_ticket_messages_ticket_msg ON public.discord_ticket_messages(ticket_message_id);

-- Enable RLS on new tables
ALTER TABLE public.discord_ticket_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discord_ticket_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for discord_ticket_channels
CREATE POLICY "Users can view their ticket channels"
  ON public.discord_ticket_channels FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets
      WHERE support_tickets.id = discord_ticket_channels.ticket_id
      AND support_tickets.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all ticket channels"
  ON public.discord_ticket_channels FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Service can manage ticket channels"
  ON public.discord_ticket_channels FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- RLS Policies for discord_ticket_messages
CREATE POLICY "Users can view their message syncs"
  ON public.discord_ticket_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets
      WHERE support_tickets.id = discord_ticket_messages.ticket_id
      AND support_tickets.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all message syncs"
  ON public.discord_ticket_messages FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Service can manage message syncs"
  ON public.discord_ticket_messages FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Add discord_synced column to ticket_messages
ALTER TABLE public.ticket_messages ADD COLUMN IF NOT EXISTS discord_synced BOOLEAN DEFAULT false;