-- Create contracts table for creator agreements
CREATE TABLE public.creator_contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  creator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  creator_email TEXT NOT NULL,
  boost_id UUID REFERENCES public.bounty_campaigns(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'signed', 'expired', 'cancelled')),
  monthly_rate NUMERIC NOT NULL DEFAULT 0,
  videos_per_month INTEGER NOT NULL DEFAULT 1,
  start_date DATE NOT NULL,
  end_date DATE,
  duration_months INTEGER NOT NULL DEFAULT 12,
  custom_terms TEXT,
  signed_at TIMESTAMP WITH TIME ZONE,
  signature_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.creator_contracts ENABLE ROW LEVEL SECURITY;

-- Brand members can view contracts for their brand
CREATE POLICY "Brand members can view contracts"
ON public.creator_contracts
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.brand_members
    WHERE brand_members.brand_id = creator_contracts.brand_id
    AND brand_members.user_id = auth.uid()
  )
);

-- Brand members can create contracts for their brand
CREATE POLICY "Brand members can create contracts"
ON public.creator_contracts
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.brand_members
    WHERE brand_members.brand_id = creator_contracts.brand_id
    AND brand_members.user_id = auth.uid()
  )
);

-- Brand members can update contracts for their brand
CREATE POLICY "Brand members can update contracts"
ON public.creator_contracts
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.brand_members
    WHERE brand_members.brand_id = creator_contracts.brand_id
    AND brand_members.user_id = auth.uid()
  )
);

-- Brand members can delete draft contracts
CREATE POLICY "Brand members can delete draft contracts"
ON public.creator_contracts
FOR DELETE
USING (
  status = 'draft' AND
  EXISTS (
    SELECT 1 FROM public.brand_members
    WHERE brand_members.brand_id = creator_contracts.brand_id
    AND brand_members.user_id = auth.uid()
  )
);

-- Creators can view their own contracts
CREATE POLICY "Creators can view their contracts"
ON public.creator_contracts
FOR SELECT
USING (creator_id = auth.uid());

-- Creators can update their contracts (for signing)
CREATE POLICY "Creators can sign their contracts"
ON public.creator_contracts
FOR UPDATE
USING (creator_id = auth.uid())
WITH CHECK (creator_id = auth.uid());

-- Create updated_at trigger
CREATE TRIGGER update_creator_contracts_updated_at
BEFORE UPDATE ON public.creator_contracts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for faster queries
CREATE INDEX idx_creator_contracts_brand_id ON public.creator_contracts(brand_id);
CREATE INDEX idx_creator_contracts_creator_id ON public.creator_contracts(creator_id);
CREATE INDEX idx_creator_contracts_status ON public.creator_contracts(status);