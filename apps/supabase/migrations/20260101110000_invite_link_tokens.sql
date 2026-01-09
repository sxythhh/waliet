-- Add invite token columns to brand_invitations for link-based invites
ALTER TABLE public.brand_invitations
ADD COLUMN IF NOT EXISTS invite_token TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS is_link_invite BOOLEAN DEFAULT FALSE;

-- Create index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_brand_invitations_invite_token
ON public.brand_invitations(invite_token)
WHERE invite_token IS NOT NULL;

-- Allow nullable email for link-based invites
ALTER TABLE public.brand_invitations
ALTER COLUMN email DROP NOT NULL;

-- Add check constraint to ensure either email or invite_token is provided
ALTER TABLE public.brand_invitations
ADD CONSTRAINT check_invite_type
CHECK (email IS NOT NULL OR invite_token IS NOT NULL);
