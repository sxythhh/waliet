-- Fix the function search path for get_pending_amount
CREATE OR REPLACE FUNCTION public.get_pending_amount(ledger payment_ledger)
RETURNS NUMERIC AS $$
BEGIN
  RETURN GREATEST(0, ledger.accrued_amount - ledger.paid_amount);
END;
$$ LANGUAGE plpgsql STABLE SET search_path = public;