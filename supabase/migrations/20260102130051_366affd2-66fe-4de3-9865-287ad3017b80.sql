-- Create pitches table for creator-to-brand pitches
CREATE TABLE IF NOT EXISTS public.pitches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'viewed', 'accepted', 'rejected')),
  response TEXT,
  responded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pitches ENABLE ROW LEVEL SECURITY;

-- Creators can view and create their own pitches
CREATE POLICY "Creators can view their own pitches"
  ON public.pitches FOR SELECT
  USING (auth.uid() = creator_id);

CREATE POLICY "Creators can create pitches"
  ON public.pitches FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

-- Brand members can view pitches to their brand
CREATE POLICY "Brand members can view pitches to their brand"
  ON public.pitches FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.brand_members
      WHERE brand_members.brand_id = pitches.brand_id
      AND brand_members.user_id = auth.uid()
    )
  );

-- Brand members can update pitch status
CREATE POLICY "Brand members can update pitches"
  ON public.pitches FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.brand_members
      WHERE brand_members.brand_id = pitches.brand_id
      AND brand_members.user_id = auth.uid()
    )
  );

-- Create indexes
CREATE INDEX idx_pitches_creator_id ON public.pitches(creator_id);
CREATE INDEX idx_pitches_brand_id ON public.pitches(brand_id);
CREATE INDEX idx_pitches_status ON public.pitches(status);

-- Create discord_ticket_config table
CREATE TABLE IF NOT EXISTS public.discord_ticket_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  guild_id TEXT NOT NULL,
  category_id TEXT,
  support_role_id TEXT,
  welcome_message TEXT DEFAULT 'Welcome! A team member will be with you shortly.',
  auto_close_hours INTEGER DEFAULT 48,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(brand_id, guild_id)
);

-- Enable RLS
ALTER TABLE public.discord_ticket_config ENABLE ROW LEVEL SECURITY;

-- Brand members can manage their ticket config
CREATE POLICY "Brand members can view ticket config"
  ON public.discord_ticket_config FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.brand_members
      WHERE brand_members.brand_id = discord_ticket_config.brand_id
      AND brand_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Brand members can insert ticket config"
  ON public.discord_ticket_config FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.brand_members
      WHERE brand_members.brand_id = discord_ticket_config.brand_id
      AND brand_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Brand members can update ticket config"
  ON public.discord_ticket_config FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.brand_members
      WHERE brand_members.brand_id = discord_ticket_config.brand_id
      AND brand_members.user_id = auth.uid()
    )
  );

-- Create discord_tickets table
CREATE TABLE IF NOT EXISTS public.discord_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  config_id UUID REFERENCES public.discord_ticket_config(id) ON DELETE SET NULL,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  discord_user_id TEXT NOT NULL,
  discord_username TEXT,
  channel_id TEXT,
  subject TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'resolved')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  assigned_to UUID REFERENCES public.profiles(id),
  closed_at TIMESTAMP WITH TIME ZONE,
  closed_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.discord_tickets ENABLE ROW LEVEL SECURITY;

-- Brand members can manage tickets
CREATE POLICY "Brand members can view tickets"
  ON public.discord_tickets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.brand_members
      WHERE brand_members.brand_id = discord_tickets.brand_id
      AND brand_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Brand members can update tickets"
  ON public.discord_tickets FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.brand_members
      WHERE brand_members.brand_id = discord_tickets.brand_id
      AND brand_members.user_id = auth.uid()
    )
  );

-- Create indexes
CREATE INDEX idx_discord_tickets_brand_id ON public.discord_tickets(brand_id);
CREATE INDEX idx_discord_tickets_status ON public.discord_tickets(status);
CREATE INDEX idx_discord_tickets_discord_user_id ON public.discord_tickets(discord_user_id);