-- Add foreign key constraint from payout_requests to profiles
ALTER TABLE public.payout_requests
ADD CONSTRAINT payout_requests_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES public.profiles(id)
ON DELETE CASCADE;