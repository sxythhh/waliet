-- Google Calendar Integration for Admin Tools
-- Two-way sync between Virality admin tools calendar and workspace Google Calendar

-- Add Google Calendar fields to tools_workspaces
ALTER TABLE public.tools_workspaces
ADD COLUMN IF NOT EXISTS google_calendar_id text,
ADD COLUMN IF NOT EXISTS google_calendar_name text,
ADD COLUMN IF NOT EXISTS google_connected_at timestamptz,
ADD COLUMN IF NOT EXISTS google_connected_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS google_webhook_channel_id text,
ADD COLUMN IF NOT EXISTS google_webhook_resource_id text,
ADD COLUMN IF NOT EXISTS google_webhook_expiration timestamptz,
ADD COLUMN IF NOT EXISTS google_sync_token text;

-- Token storage (encrypted, following discord_tokens pattern)
CREATE TABLE IF NOT EXISTS public.google_calendar_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL UNIQUE REFERENCES public.tools_workspaces(id) ON DELETE CASCADE,
  access_token_encrypted text NOT NULL,
  refresh_token_encrypted text NOT NULL,
  token_expires_at timestamptz NOT NULL,
  scope text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on google_calendar_tokens
ALTER TABLE public.google_calendar_tokens ENABLE ROW LEVEL SECURITY;

-- Admin-only access policy for google_calendar_tokens
-- Only admins can view calendar tokens (through Edge Functions with service role)
CREATE POLICY "Admins can view google calendar tokens"
ON public.google_calendar_tokens
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- No direct insert/update/delete by users - only through edge functions with service role

-- Index for faster Google event lookups on tools_events
CREATE INDEX IF NOT EXISTS idx_tools_events_google_event_id
ON public.tools_events(google_event_id) WHERE google_event_id IS NOT NULL;

-- Index for faster workspace lookups by Google calendar ID
CREATE INDEX IF NOT EXISTS idx_tools_workspaces_google_calendar_id
ON public.tools_workspaces(google_calendar_id) WHERE google_calendar_id IS NOT NULL;

-- Comment for documentation
COMMENT ON TABLE public.google_calendar_tokens IS 'Encrypted Google Calendar OAuth tokens for workspace calendar sync';
COMMENT ON COLUMN public.tools_workspaces.google_calendar_id IS 'Google Calendar ID linked to this workspace';
COMMENT ON COLUMN public.tools_workspaces.google_sync_token IS 'Incremental sync token for efficient event syncing';
COMMENT ON COLUMN public.tools_workspaces.google_webhook_channel_id IS 'Channel ID for Google push notifications';
