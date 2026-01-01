-- Create enum types for ticket status, priority, and category
CREATE TYPE ticket_status AS ENUM ('open', 'in_progress', 'awaiting_reply', 'resolved', 'closed');
CREATE TYPE ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE ticket_category AS ENUM ('billing', 'technical', 'account', 'campaign', 'payout', 'other');
CREATE TYPE message_sender_type AS ENUM ('user', 'admin');

-- Create support_tickets table
CREATE TABLE public.support_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_number TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  category ticket_category NOT NULL DEFAULT 'other',
  priority ticket_priority NOT NULL DEFAULT 'medium',
  status ticket_status NOT NULL DEFAULT 'open',
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create ticket_messages table
CREATE TABLE public.ticket_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_type message_sender_type NOT NULL,
  content TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sequence for ticket numbers
CREATE SEQUENCE IF NOT EXISTS ticket_number_seq START WITH 1;

-- Function to generate ticket number
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN 'TKT-' || LPAD(nextval('ticket_number_seq')::TEXT, 5, '0');
END;
$$;

-- Trigger to auto-generate ticket number
CREATE OR REPLACE FUNCTION set_ticket_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
    NEW.ticket_number := generate_ticket_number();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_set_ticket_number
  BEFORE INSERT ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION set_ticket_number();

-- Trigger for updated_at
CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better query performance
CREATE INDEX idx_support_tickets_user_id ON public.support_tickets(user_id);
CREATE INDEX idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX idx_support_tickets_assigned_to ON public.support_tickets(assigned_to);
CREATE INDEX idx_support_tickets_priority ON public.support_tickets(priority);
CREATE INDEX idx_support_tickets_created_at ON public.support_tickets(created_at DESC);
CREATE INDEX idx_ticket_messages_ticket_id ON public.ticket_messages(ticket_id);
CREATE INDEX idx_ticket_messages_created_at ON public.ticket_messages(created_at);

-- Enable RLS
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for support_tickets
-- Users can view their own tickets
CREATE POLICY "Users can view their own tickets"
  ON public.support_tickets
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own tickets
CREATE POLICY "Users can create their own tickets"
  ON public.support_tickets
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all tickets
CREATE POLICY "Admins can view all tickets"
  ON public.support_tickets
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update all tickets
CREATE POLICY "Admins can update all tickets"
  ON public.support_tickets
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for ticket_messages
-- Users can view messages on their tickets (excluding internal notes)
CREATE POLICY "Users can view messages on their tickets"
  ON public.ticket_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets
      WHERE id = ticket_id AND user_id = auth.uid()
    )
    AND is_internal = false
  );

-- Users can send messages on their tickets
CREATE POLICY "Users can send messages on their tickets"
  ON public.ticket_messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.support_tickets
      WHERE id = ticket_id AND user_id = auth.uid()
    )
    AND sender_type = 'user'
    AND is_internal = false
  );

-- Admins can view all messages
CREATE POLICY "Admins can view all messages"
  ON public.ticket_messages
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins can send messages
CREATE POLICY "Admins can send messages"
  ON public.ticket_messages
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Enable realtime for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_messages;