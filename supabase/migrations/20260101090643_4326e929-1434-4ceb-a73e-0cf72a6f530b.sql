-- Create brand_creator_notes table
CREATE TABLE public.brand_creator_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  note_content TEXT,
  tags TEXT[],
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(brand_id, creator_id)
);

-- Create brand_webhooks table
CREATE TABLE public.brand_webhooks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  endpoint_url TEXT NOT NULL,
  secret_key TEXT NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  api_version TEXT DEFAULT 'v1',
  events TEXT[] NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMP WITH TIME ZONE,
  last_status_code INTEGER,
  failure_count INTEGER DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create webhook_logs table
CREATE TABLE public.webhook_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  webhook_id UUID NOT NULL REFERENCES public.brand_webhooks(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  response_status INTEGER,
  response_body TEXT,
  success BOOLEAN NOT NULL,
  duration_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.brand_creator_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for brand_creator_notes
CREATE POLICY "Brand members can view their brand's notes"
ON public.brand_creator_notes FOR SELECT
USING (public.is_brand_member(auth.uid(), brand_id));

CREATE POLICY "Brand members can create notes"
ON public.brand_creator_notes FOR INSERT
WITH CHECK (public.is_brand_member(auth.uid(), brand_id));

CREATE POLICY "Brand members can update their brand's notes"
ON public.brand_creator_notes FOR UPDATE
USING (public.is_brand_member(auth.uid(), brand_id));

CREATE POLICY "Brand members can delete their brand's notes"
ON public.brand_creator_notes FOR DELETE
USING (public.is_brand_member(auth.uid(), brand_id));

-- RLS policies for brand_webhooks
CREATE POLICY "Brand members can view their brand's webhooks"
ON public.brand_webhooks FOR SELECT
USING (public.is_brand_member(auth.uid(), brand_id));

CREATE POLICY "Brand admins can create webhooks"
ON public.brand_webhooks FOR INSERT
WITH CHECK (public.is_brand_admin(auth.uid(), brand_id));

CREATE POLICY "Brand admins can update webhooks"
ON public.brand_webhooks FOR UPDATE
USING (public.is_brand_admin(auth.uid(), brand_id));

CREATE POLICY "Brand admins can delete webhooks"
ON public.brand_webhooks FOR DELETE
USING (public.is_brand_admin(auth.uid(), brand_id));

-- RLS policies for webhook_logs
CREATE POLICY "Brand members can view logs for their webhooks"
ON public.webhook_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.brand_webhooks w
    WHERE w.id = webhook_id
    AND public.is_brand_member(auth.uid(), w.brand_id)
  )
);

-- Add updated_at trigger for brand_creator_notes
CREATE TRIGGER update_brand_creator_notes_updated_at
BEFORE UPDATE ON public.brand_creator_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_brand_creator_notes_brand_id ON public.brand_creator_notes(brand_id);
CREATE INDEX idx_brand_creator_notes_creator_id ON public.brand_creator_notes(creator_id);
CREATE INDEX idx_brand_webhooks_brand_id ON public.brand_webhooks(brand_id);
CREATE INDEX idx_webhook_logs_webhook_id ON public.webhook_logs(webhook_id);
CREATE INDEX idx_webhook_logs_created_at ON public.webhook_logs(created_at DESC);