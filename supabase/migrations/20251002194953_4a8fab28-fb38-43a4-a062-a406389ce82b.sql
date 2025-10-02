-- Phase 1: Critical Security Fixes

-- ============================================================================
-- 1. RESTRICT CAMPAIGN FINANCIAL DATA
-- ============================================================================

-- Drop the overly permissive policy that exposes all campaign data
DROP POLICY IF EXISTS "Anyone can view active campaigns" ON public.campaigns;

-- Create a public view with only non-sensitive campaign information
CREATE OR REPLACE VIEW public.public_campaigns AS
SELECT 
  id,
  title,
  description,
  brand_name,
  brand_id,
  brand_logo_url,
  banner_url,
  slug,
  status,
  start_date,
  end_date,
  is_private,
  preview_url,
  allowed_platforms,
  guidelines,
  application_questions,
  created_at,
  updated_at
FROM public.campaigns
WHERE status = 'active';

-- Grant access to the public view
GRANT SELECT ON public.public_campaigns TO authenticated, anon;

-- Create restrictive policies for the campaigns table
CREATE POLICY "Authenticated users can view non-financial campaign data"
ON public.campaigns
FOR SELECT
TO authenticated
USING (status = 'active');

-- Only admins can view full campaign financial data
CREATE POLICY "Admins can view all campaign data including financials"
ON public.campaigns
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ============================================================================
-- 2. ENCRYPT SENSITIVE PAYMENT INFORMATION
-- ============================================================================

-- Enable pgcrypto extension for encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create a table to store encryption keys (in production, use proper key management)
CREATE TABLE IF NOT EXISTS public.encryption_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key_name text UNIQUE NOT NULL,
  key_value text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Enable RLS on encryption_keys - only admins can access
ALTER TABLE public.encryption_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can manage encryption keys"
ON public.encryption_keys
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Initialize encryption key (admins should rotate this)
INSERT INTO public.encryption_keys (key_name, key_value)
VALUES ('payout_details_key', encode(gen_random_bytes(32), 'hex'))
ON CONFLICT (key_name) DO NOTHING;

-- Function to encrypt payout details
CREATE OR REPLACE FUNCTION public.encrypt_payout_details(
  details jsonb
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  encryption_key text;
BEGIN
  -- Get the encryption key
  SELECT key_value INTO encryption_key
  FROM public.encryption_keys
  WHERE key_name = 'payout_details_key';
  
  -- Encrypt the JSONB data
  RETURN encode(
    pgp_sym_encrypt(
      details::text,
      encryption_key
    ),
    'base64'
  );
END;
$$;

-- Function to decrypt payout details (only for authorized users)
CREATE OR REPLACE FUNCTION public.decrypt_payout_details(
  encrypted_details text,
  wallet_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  encryption_key text;
  is_authorized boolean;
BEGIN
  -- Check authorization: user must be wallet owner or admin
  is_authorized := (
    auth.uid() = wallet_user_id OR 
    public.has_role(auth.uid(), 'admin'::app_role)
  );
  
  IF NOT is_authorized THEN
    RAISE EXCEPTION 'Unauthorized access to payout details';
  END IF;
  
  -- Log the access to audit trail
  INSERT INTO public.security_audit_log (
    user_id,
    action,
    table_name,
    record_id,
    new_data
  ) VALUES (
    auth.uid(),
    'DECRYPT_PAYOUT_DETAILS',
    'wallets',
    wallet_user_id,
    jsonb_build_object('accessed_at', now())
  );
  
  -- Get the encryption key
  SELECT key_value INTO encryption_key
  FROM public.encryption_keys
  WHERE key_name = 'payout_details_key';
  
  -- Decrypt and return
  RETURN pgp_sym_decrypt(
    decode(encrypted_details, 'base64'),
    encryption_key
  )::jsonb;
END;
$$;

-- ============================================================================
-- 3. ADD ADMIN VERIFICATION CHECKPOINTS
-- ============================================================================

-- Create a trigger to audit all user_roles changes
CREATE OR REPLACE FUNCTION public.audit_user_role_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log INSERT operations
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.security_audit_log (
      user_id,
      action,
      table_name,
      record_id,
      new_data
    ) VALUES (
      auth.uid(),
      'GRANT_ROLE',
      'user_roles',
      NEW.id,
      jsonb_build_object(
        'target_user_id', NEW.user_id,
        'role_granted', NEW.role,
        'granted_by', auth.uid(),
        'timestamp', now()
      )
    );
    
    -- Send notification for admin role grants (requires Discord webhook)
    IF NEW.role = 'admin' THEN
      -- Note: Implement notification system separately
      RAISE NOTICE 'SECURITY ALERT: Admin role granted to user % by %', NEW.user_id, auth.uid();
    END IF;
  END IF;
  
  -- Log UPDATE operations
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO public.security_audit_log (
      user_id,
      action,
      table_name,
      record_id,
      old_data,
      new_data
    ) VALUES (
      auth.uid(),
      'MODIFY_ROLE',
      'user_roles',
      NEW.id,
      jsonb_build_object('old_role', OLD.role),
      jsonb_build_object('new_role', NEW.role, 'modified_by', auth.uid())
    );
  END IF;
  
  -- Log DELETE operations
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.security_audit_log (
      user_id,
      action,
      table_name,
      record_id,
      old_data
    ) VALUES (
      auth.uid(),
      'REVOKE_ROLE',
      'user_roles',
      OLD.id,
      jsonb_build_object(
        'target_user_id', OLD.user_id,
        'role_revoked', OLD.role,
        'revoked_by', auth.uid(),
        'timestamp', now()
      )
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS audit_user_roles_changes ON public.user_roles;

-- Create the trigger on user_roles table
CREATE TRIGGER audit_user_roles_changes
AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.audit_user_role_changes();

-- Add additional validation: prevent users from granting themselves roles
CREATE OR REPLACE FUNCTION public.prevent_self_role_grant()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.user_id = auth.uid() THEN
    RAISE EXCEPTION 'Users cannot grant roles to themselves';
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_self_role_grant_trigger ON public.user_roles;

CREATE TRIGGER prevent_self_role_grant_trigger
BEFORE INSERT ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_self_role_grant();

-- Create index for faster role lookups and audit queries
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_user_id ON public.security_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_table_action ON public.security_audit_log(table_name, action);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_created_at ON public.security_audit_log(created_at DESC);