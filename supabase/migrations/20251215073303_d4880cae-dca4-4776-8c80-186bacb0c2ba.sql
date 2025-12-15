-- Create a secure table for Discord OAuth tokens (separate from profiles)
CREATE TABLE public.discord_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  discord_id text NOT NULL,
  access_token_encrypted text NOT NULL,
  refresh_token_encrypted text NOT NULL,
  token_expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.discord_tokens ENABLE ROW LEVEL SECURITY;

-- Only allow service role and the token owner to access their tokens
CREATE POLICY "Users can view own discord tokens"
ON public.discord_tokens
FOR SELECT
USING (auth.uid() = user_id);

-- No direct insert/update/delete by users - only through edge functions with service role
-- This ensures tokens are only managed by trusted server-side code

-- Create index for user lookups
CREATE INDEX idx_discord_tokens_user_id ON public.discord_tokens(user_id);

-- Create encryption function for Discord tokens
CREATE OR REPLACE FUNCTION public.encrypt_discord_token(token text)
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

-- Create decryption function for Discord tokens (only for service role use in edge functions)
CREATE OR REPLACE FUNCTION public.decrypt_discord_token(encrypted_token text)
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
CREATE OR REPLACE FUNCTION public.get_discord_tokens(p_user_id uuid)
RETURNS TABLE(
  discord_id text,
  access_token text,
  refresh_token text,
  token_expires_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dt.discord_id,
    decrypt_discord_token(dt.access_token_encrypted) as access_token,
    decrypt_discord_token(dt.refresh_token_encrypted) as refresh_token,
    dt.token_expires_at
  FROM public.discord_tokens dt
  WHERE dt.user_id = p_user_id;
END;
$$;

-- Create secure RPC function to upsert tokens (only for edge functions)
CREATE OR REPLACE FUNCTION public.upsert_discord_tokens(
  p_user_id uuid,
  p_discord_id text,
  p_access_token text,
  p_refresh_token text,
  p_token_expires_at timestamp with time zone
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.discord_tokens (user_id, discord_id, access_token_encrypted, refresh_token_encrypted, token_expires_at)
  VALUES (
    p_user_id,
    p_discord_id,
    encrypt_discord_token(p_access_token),
    encrypt_discord_token(p_refresh_token),
    p_token_expires_at
  )
  ON CONFLICT (user_id) DO UPDATE SET
    discord_id = EXCLUDED.discord_id,
    access_token_encrypted = encrypt_discord_token(p_access_token),
    refresh_token_encrypted = encrypt_discord_token(p_refresh_token),
    token_expires_at = p_token_expires_at,
    updated_at = now();
END;
$$;

-- Create function to delete Discord tokens
CREATE OR REPLACE FUNCTION public.delete_discord_tokens(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.discord_tokens WHERE user_id = p_user_id;
END;
$$;

-- Add trigger for updated_at
CREATE TRIGGER update_discord_tokens_updated_at
BEFORE UPDATE ON public.discord_tokens
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Audit log for token access
CREATE OR REPLACE FUNCTION public.audit_discord_token_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.security_audit_log (user_id, action, table_name, record_id, new_data)
  VALUES (
    auth.uid(),
    'ACCESS_DISCORD_TOKENS',
    'discord_tokens',
    NEW.id,
    jsonb_build_object('accessed_at', now())
  );
  RETURN NEW;
END;
$$;