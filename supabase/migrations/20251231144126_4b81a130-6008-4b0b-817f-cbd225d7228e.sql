-- Create fraud_flags table
CREATE TABLE IF NOT EXISTS public.fraud_flags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  submission_id UUID,
  flag_type TEXT NOT NULL,
  flag_reason TEXT,
  severity TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES auth.users
);

-- Create creator_fraud_history table
CREATE TABLE IF NOT EXISTS public.creator_fraud_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  fraud_amount NUMERIC DEFAULT 0,
  fraud_count INTEGER DEFAULT 0,
  last_fraud_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create fraud_evidence table
CREATE TABLE IF NOT EXISTS public.fraud_evidence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fraud_flag_id UUID REFERENCES public.fraud_flags(id) ON DELETE CASCADE,
  evidence_type TEXT NOT NULL,
  evidence_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create auto_rejection_rules table
CREATE TABLE IF NOT EXISTS public.auto_rejection_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE NOT NULL,
  rule_type TEXT NOT NULL,
  rule_config JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create auto_rejection_log table
CREATE TABLE IF NOT EXISTS public.auto_rejection_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_id UUID REFERENCES public.auto_rejection_rules(id) ON DELETE SET NULL,
  submission_id UUID,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create brand_broadcasts table
CREATE TABLE IF NOT EXISTS public.brand_broadcasts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  broadcast_type TEXT DEFAULT 'announcement',
  status TEXT DEFAULT 'draft',
  scheduled_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create brand_broadcast_reads table
CREATE TABLE IF NOT EXISTS public.brand_broadcast_reads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  broadcast_id UUID REFERENCES public.brand_broadcasts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(broadcast_id, user_id)
);

-- Create brand_broadcast_targets table
CREATE TABLE IF NOT EXISTS public.brand_broadcast_targets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  broadcast_id UUID REFERENCES public.brand_broadcasts(id) ON DELETE CASCADE NOT NULL,
  boost_id UUID REFERENCES public.bounty_campaigns(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add auto_approval_status column to submission_payout_requests if it doesn't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'submission_payout_requests' 
    AND column_name = 'auto_approval_status'
  ) THEN
    ALTER TABLE public.submission_payout_requests ADD COLUMN auto_approval_status TEXT DEFAULT 'pending';
  END IF;
END $$;

-- Enable RLS on all new tables
ALTER TABLE public.fraud_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_fraud_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fraud_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_rejection_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_rejection_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_broadcast_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_broadcast_targets ENABLE ROW LEVEL SECURITY;

-- Create policies for fraud_flags (admin only)
CREATE POLICY "Admin can manage fraud flags" ON public.fraud_flags FOR ALL USING (true);

-- Create policies for creator_fraud_history (admin only)
CREATE POLICY "Admin can manage fraud history" ON public.creator_fraud_history FOR ALL USING (true);

-- Create policies for fraud_evidence (admin only)
CREATE POLICY "Admin can manage fraud evidence" ON public.fraud_evidence FOR ALL USING (true);

-- Create policies for auto_rejection_rules
CREATE POLICY "Brand members can view rejection rules" ON public.auto_rejection_rules FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.brand_members WHERE brand_id = auto_rejection_rules.brand_id AND user_id = auth.uid())
);
CREATE POLICY "Brand members can manage rejection rules" ON public.auto_rejection_rules FOR ALL USING (
  EXISTS (SELECT 1 FROM public.brand_members WHERE brand_id = auto_rejection_rules.brand_id AND user_id = auth.uid())
);

-- Create policies for auto_rejection_log
CREATE POLICY "Brand members can view rejection log" ON public.auto_rejection_log FOR SELECT USING (true);

-- Create policies for brand_broadcasts
CREATE POLICY "Brand members can manage broadcasts" ON public.brand_broadcasts FOR ALL USING (
  EXISTS (SELECT 1 FROM public.brand_members WHERE brand_id = brand_broadcasts.brand_id AND user_id = auth.uid())
);

-- Create policies for brand_broadcast_reads
CREATE POLICY "Users can manage their broadcast reads" ON public.brand_broadcast_reads FOR ALL USING (auth.uid() = user_id);

-- Create policies for brand_broadcast_targets
CREATE POLICY "Brand members can manage broadcast targets" ON public.brand_broadcast_targets FOR ALL USING (true);