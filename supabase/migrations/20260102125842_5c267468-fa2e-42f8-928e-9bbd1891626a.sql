-- Add note column to p2p_transfers table
ALTER TABLE public.p2p_transfers ADD COLUMN IF NOT EXISTS note TEXT;