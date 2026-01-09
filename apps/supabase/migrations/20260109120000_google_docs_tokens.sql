-- Google Docs Integration for Blueprint Import
-- User-scoped OAuth tokens for accessing Google Docs/Drive

-- Token storage (encrypted, following discord_tokens pattern)
CREATE TABLE public.google_docs_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token_encrypted text NOT NULL,
  refresh_token_encrypted text NOT NULL,
  token_expires_at timestamptz NOT NULL,
  scope text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.google_docs_tokens ENABLE ROW LEVEL SECURITY;

-- Only allow service role and the token owner to access their tokens
CREATE POLICY "Users can view own google docs tokens"
ON public.google_docs_tokens
FOR SELECT
USING (auth.uid() = user_id);

-- No direct insert/update/delete by users - only through edge functions with service role

-- Create index for user lookups
CREATE INDEX idx_google_docs_tokens_user_id ON public.google_docs_tokens(user_id);

-- Create encryption function for Google Docs tokens
CREATE OR REPLACE FUNCTION public.encrypt_google_docs_token(token text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  encryption_key text;
BEGIN
  SELECT key_value INTO encryption_key
  FROM public.encryption_keys
  WHERE key_name = 'payout_details_key';

  IF encryption_key IS NULL THEN
    RAISE EXCEPTION 'Encryption key not found';
  END IF;

  RETURN encode(pgp_sym_encrypt(token, encryption_key), 'base64');
END;
$$;

-- Create decryption function for Google Docs tokens (only for service role use in edge functions)
CREATE OR REPLACE FUNCTION public.decrypt_google_docs_token(encrypted_token text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  encryption_key text;
BEGIN
  SELECT key_value INTO encryption_key
  FROM public.encryption_keys
  WHERE key_name = 'payout_details_key';

  IF encryption_key IS NULL THEN
    RAISE EXCEPTION 'Encryption key not found';
  END IF;

  RETURN pgp_sym_decrypt(decode(encrypted_token, 'base64'), encryption_key);
END;
$$;

-- Create secure RPC function to get decrypted tokens (only for edge functions)
CREATE OR REPLACE FUNCTION public.get_google_docs_tokens(p_user_id uuid)
RETURNS TABLE(
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  scope text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    decrypt_google_docs_token(gdt.access_token_encrypted) as access_token,
    decrypt_google_docs_token(gdt.refresh_token_encrypted) as refresh_token,
    gdt.token_expires_at,
    gdt.scope
  FROM public.google_docs_tokens gdt
  WHERE gdt.user_id = p_user_id;
END;
$$;

-- Create secure RPC function to upsert tokens (only for edge functions)
CREATE OR REPLACE FUNCTION public.upsert_google_docs_tokens(
  p_user_id uuid,
  p_access_token text,
  p_refresh_token text,
  p_token_expires_at timestamptz,
  p_scope text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.google_docs_tokens (user_id, access_token_encrypted, refresh_token_encrypted, token_expires_at, scope)
  VALUES (
    p_user_id,
    encrypt_google_docs_token(p_access_token),
    encrypt_google_docs_token(p_refresh_token),
    p_token_expires_at,
    p_scope
  )
  ON CONFLICT (user_id) DO UPDATE SET
    access_token_encrypted = encrypt_google_docs_token(p_access_token),
    refresh_token_encrypted = encrypt_google_docs_token(p_refresh_token),
    token_expires_at = p_token_expires_at,
    scope = COALESCE(p_scope, public.google_docs_tokens.scope),
    updated_at = now();
END;
$$;

-- Create function to delete Google Docs tokens
CREATE OR REPLACE FUNCTION public.delete_google_docs_tokens(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.google_docs_tokens WHERE user_id = p_user_id;
END;
$$;

-- Check if user has valid Google Docs connection
CREATE OR REPLACE FUNCTION public.check_google_docs_connection(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  expires_at timestamptz;
BEGIN
  SELECT token_expires_at INTO expires_at
  FROM public.google_docs_tokens
  WHERE user_id = p_user_id;

  -- Return true if token exists and hasn't expired (with 5 min buffer)
  RETURN expires_at IS NOT NULL AND expires_at > (now() + interval '5 minutes');
END;
$$;

-- Add trigger for updated_at
CREATE TRIGGER update_google_docs_tokens_updated_at
BEFORE UPDATE ON public.google_docs_tokens
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Comment for documentation
COMMENT ON TABLE public.google_docs_tokens IS 'Encrypted Google Docs/Drive OAuth tokens for blueprint import';
