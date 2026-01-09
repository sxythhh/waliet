-- Create IP bans table for banning users by IP
CREATE TABLE public.ip_bans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address text NOT NULL,
  reason text,
  banned_by uuid,
  banned_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ip_bans ENABLE ROW LEVEL SECURITY;

-- Only admins can manage IP bans
CREATE POLICY "Admins can manage IP bans"
ON public.ip_bans
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster lookups
CREATE INDEX idx_ip_bans_ip_address ON public.ip_bans(ip_address);
CREATE INDEX idx_ip_bans_user_id ON public.ip_bans(user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_ip_bans_updated_at
BEFORE UPDATE ON public.ip_bans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();