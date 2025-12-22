-- Drop the existing insert policy
DROP POLICY IF EXISTS "Brand admins can insert transactions" ON public.brand_wallet_transactions;

-- Create new policy that allows brand admins OR global admins
CREATE POLICY "Brand admins or global admins can insert transactions" 
ON public.brand_wallet_transactions 
FOR INSERT 
WITH CHECK (
  is_brand_admin(auth.uid(), brand_id) 
  OR has_role(auth.uid(), 'admin'::app_role)
);