-- Create payout_requests table
CREATE TABLE public.payout_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  payout_method text NOT NULL,
  payout_details jsonb NOT NULL,
  requested_at timestamp with time zone NOT NULL DEFAULT now(),
  processed_at timestamp with time zone,
  processed_by uuid,
  rejection_reason text,
  transaction_id text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own payout requests
CREATE POLICY "Users can view own payout requests"
ON public.payout_requests
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own payout requests
CREATE POLICY "Users can create own payout requests"
ON public.payout_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id AND status = 'pending');

-- Admins can view all payout requests
CREATE POLICY "Admins can view all payout requests"
ON public.payout_requests
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update payout requests
CREATE POLICY "Admins can update payout requests"
ON public.payout_requests
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_payout_requests_updated_at
BEFORE UPDATE ON public.payout_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_payout_requests_user_id ON public.payout_requests(user_id);
CREATE INDEX idx_payout_requests_status ON public.payout_requests(status);
CREATE INDEX idx_payout_requests_requested_at ON public.payout_requests(requested_at DESC);