-- Add RLS policy to allow brand members to view campaign transactions
CREATE POLICY "Brand members can view campaign transactions"
ON wallet_transactions
FOR SELECT
USING (
  metadata->>'campaign_id' IN (
    SELECT c.id::text
    FROM campaigns c
    WHERE is_brand_member(auth.uid(), c.brand_id)
  )
);