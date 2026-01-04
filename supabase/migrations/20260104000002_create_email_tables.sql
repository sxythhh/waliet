-- Email templates table
CREATE TABLE email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Email broadcasts table
CREATE TABLE email_broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  template_id UUID REFERENCES email_templates(id),
  segment TEXT DEFAULT 'all', -- 'all', 'creators', 'brands', 'custom'
  segment_filter JSONB,
  recipient_count INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'draft', -- 'draft', 'sending', 'sent', 'failed', 'partial'
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Email logs table (tracks individual emails)
CREATE TABLE email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resend_id TEXT,
  broadcast_id UUID REFERENCES email_broadcasts(id),
  recipient_email TEXT NOT NULL,
  recipient_id UUID REFERENCES auth.users(id),
  subject TEXT NOT NULL,
  status TEXT DEFAULT 'sent', -- 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained'
  error_message TEXT,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_email_broadcasts_status ON email_broadcasts(status);
CREATE INDEX idx_email_broadcasts_created_at ON email_broadcasts(created_at DESC);
CREATE INDEX idx_email_logs_broadcast_id ON email_logs(broadcast_id);
CREATE INDEX idx_email_logs_recipient_email ON email_logs(recipient_email);
CREATE INDEX idx_email_logs_status ON email_logs(status);
CREATE INDEX idx_email_logs_created_at ON email_logs(created_at DESC);
CREATE INDEX idx_email_templates_created_at ON email_templates(created_at DESC);

-- RLS policies
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can access email tables (via service role key in edge functions)
-- No public access policies needed since these are admin-only tables
