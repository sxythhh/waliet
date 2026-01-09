-- Create enum for sales pipeline stages
CREATE TYPE public.sales_stage AS ENUM (
  'lead',
  'qualified',
  'proposal',
  'negotiation',
  'won',
  'lost'
);

-- Create sales_deals table
CREATE TABLE public.sales_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  stage sales_stage NOT NULL DEFAULT 'lead',
  deal_value NUMERIC,
  probability INTEGER DEFAULT 50 CHECK (probability >= 0 AND probability <= 100),
  close_date DATE,
  next_payment_date DATE,
  payment_amount NUMERIC,
  owner_id UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  won_date DATE,
  lost_reason TEXT,
  UNIQUE(brand_id)
);

-- Enable RLS
ALTER TABLE public.sales_deals ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage all sales deals"
ON public.sales_deals
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Update trigger
CREATE TRIGGER update_sales_deals_updated_at
BEFORE UPDATE ON public.sales_deals
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();