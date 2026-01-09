-- Migration: Add public application form settings to bounty_campaigns
-- This enables brands to share public application URLs for their boost campaigns

-- Add columns for public application form configuration
ALTER TABLE bounty_campaigns
ADD COLUMN IF NOT EXISTS public_application_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS public_form_settings jsonb DEFAULT '{}'::jsonb;

-- Add comment explaining the public_form_settings structure
COMMENT ON COLUMN bounty_campaigns.public_form_settings IS
'JSON configuration for public application form: {
  "require_discord": boolean - require Discord account connection,
  "require_phone": boolean - require phone number,
  "require_social_account": boolean - require social media account,
  "social_platforms": ["tiktok", "instagram", "youtube"] - which platforms to accept,
  "custom_intro_text": string - optional intro text for the form,
  "success_message": string - custom success message after submission
}';

-- Create table for public form applications (for users who apply without an account)
-- These are different from bounty_applications which require a user_id
CREATE TABLE IF NOT EXISTS public_boost_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bounty_campaign_id uuid NOT NULL REFERENCES bounty_campaigns(id) ON DELETE CASCADE,
  email text NOT NULL,
  phone_number text,
  discord_id text,
  discord_username text,
  social_accounts jsonb DEFAULT '[]'::jsonb,
  application_answers jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'waitlisted', 'converted')),
  waitlist_position integer,
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES profiles(id),
  converted_user_id uuid REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_public_boost_applications_bounty_campaign
ON public_boost_applications(bounty_campaign_id);

CREATE INDEX IF NOT EXISTS idx_public_boost_applications_email
ON public_boost_applications(email);

CREATE INDEX IF NOT EXISTS idx_public_boost_applications_status
ON public_boost_applications(status);

-- Add RLS policies
ALTER TABLE public_boost_applications ENABLE ROW LEVEL SECURITY;

-- Allow public inserts (for form submissions without auth)
CREATE POLICY "Allow public insert on public_boost_applications"
ON public_boost_applications
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Allow brand members to view applications for their boosts
CREATE POLICY "Brand members can view public applications"
ON public_boost_applications
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM bounty_campaigns bc
    JOIN brand_members bm ON bc.brand_id = bm.brand_id
    WHERE bc.id = public_boost_applications.bounty_campaign_id
    AND bm.user_id = auth.uid()
  )
);

-- Allow brand members to update applications (for review)
CREATE POLICY "Brand members can update public applications"
ON public_boost_applications
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM bounty_campaigns bc
    JOIN brand_members bm ON bc.brand_id = bm.brand_id
    WHERE bc.id = public_boost_applications.bounty_campaign_id
    AND bm.user_id = auth.uid()
  )
);

-- Allow admins full access
CREATE POLICY "Admins can manage public applications"
ON public_boost_applications
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admin_users WHERE user_id = auth.uid()
  )
);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_public_boost_applications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_public_boost_applications_updated_at
BEFORE UPDATE ON public_boost_applications
FOR EACH ROW
EXECUTE FUNCTION update_public_boost_applications_updated_at();

-- Add function to check for duplicate email submissions
CREATE OR REPLACE FUNCTION check_public_application_duplicate()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public_boost_applications
    WHERE bounty_campaign_id = NEW.bounty_campaign_id
    AND email = NEW.email
    AND status NOT IN ('rejected')
  ) THEN
    RAISE EXCEPTION 'An application with this email already exists for this boost';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_public_application_duplicate
BEFORE INSERT ON public_boost_applications
FOR EACH ROW
EXECUTE FUNCTION check_public_application_duplicate();
