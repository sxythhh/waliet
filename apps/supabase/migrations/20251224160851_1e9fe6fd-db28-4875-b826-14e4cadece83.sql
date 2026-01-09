-- Create a security definer function to check if user is a brand member for a payout item
CREATE OR REPLACE FUNCTION public.can_view_payout_item(_item_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM submission_payout_items spi
    JOIN video_submissions vs ON vs.id = spi.submission_id
    JOIN brand_members bm ON bm.brand_id = vs.brand_id
    WHERE spi.id = _item_id
    AND bm.user_id = auth.uid()
  )
$$;

-- Create a security definer function to check if user owns a payout request
CREATE OR REPLACE FUNCTION public.owns_payout_request(_request_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM submission_payout_requests
    WHERE id = _request_id
    AND user_id = auth.uid()
  )
$$;

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view their own payout items" ON public.submission_payout_items;
DROP POLICY IF EXISTS "Users can create payout items for their requests" ON public.submission_payout_items;

-- Recreate policies using the security definer functions
CREATE POLICY "Users can view their own payout items"
ON public.submission_payout_items
FOR SELECT
USING (public.owns_payout_request(payout_request_id));

CREATE POLICY "Brand members can view payout items for their campaigns"
ON public.submission_payout_items
FOR SELECT
USING (public.can_view_payout_item(id));

CREATE POLICY "Users can create payout items for their requests"
ON public.submission_payout_items
FOR INSERT
WITH CHECK (public.owns_payout_request(payout_request_id));