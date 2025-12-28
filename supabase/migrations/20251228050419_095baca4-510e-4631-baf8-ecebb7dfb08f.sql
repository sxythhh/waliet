-- Create p2p_transfers table to log all P2P transfers
CREATE TABLE public.p2p_transfers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  recipient_id UUID NOT NULL REFERENCES auth.users(id),
  amount NUMERIC NOT NULL,
  fee NUMERIC NOT NULL DEFAULT 0,
  net_amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.p2p_transfers ENABLE ROW LEVEL SECURITY;

-- Users can view their own transfers (sent or received)
CREATE POLICY "Users can view their own transfers"
ON public.p2p_transfers
FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- Only the system (service role) can insert transfers
CREATE POLICY "Service role can insert transfers"
ON public.p2p_transfers
FOR INSERT
WITH CHECK (false);

-- Create index for faster lookups
CREATE INDEX idx_p2p_transfers_sender ON public.p2p_transfers(sender_id);
CREATE INDEX idx_p2p_transfers_recipient ON public.p2p_transfers(recipient_id);