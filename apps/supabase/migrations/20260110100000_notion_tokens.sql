-- Notion Integration for Blueprint Import
-- User-scoped OAuth tokens for accessing Notion pages

-- Token storage (encrypted, following google_docs_tokens pattern)
CREATE TABLE public.notion_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token_encrypted text NOT NULL,
  workspace_id text,
  workspace_name text,
  workspace_icon text,
  bot_id text,
  token_type text DEFAULT 'bearer',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notion_tokens ENABLE ROW LEVEL SECURITY;

-- Only allow service role and the token owner to access their tokens
CREATE POLICY "Users can view own notion tokens"
ON public.notion_tokens
FOR SELECT
USING (auth.uid() = user_id);

-- No direct insert/update/delete by users - only through edge functions with service role

-- Create index for user lookups
CREATE INDEX idx_notion_tokens_user_id ON public.notion_tokens(user_id);

-- Create encryption function for Notion tokens
CREATE OR REPLACE FUNCTION public.encrypt_notion_token(token text)
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

-- Create decryption function for Notion tokens (only for service role use in edge functions)
CREATE OR REPLACE FUNCTION public.decrypt_notion_token(encrypted_token text)
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
CREATE OR REPLACE FUNCTION public.get_notion_tokens(p_user_id uuid)
RETURNS TABLE(
  access_token text,
  workspace_id text,
  workspace_name text,
  workspace_icon text,
  bot_id text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    decrypt_notion_token(nt.access_token_encrypted) as access_token,
    nt.workspace_id,
    nt.workspace_name,
    nt.workspace_icon,
    nt.bot_id
  FROM public.notion_tokens nt
  WHERE nt.user_id = p_user_id;
END;
$$;

-- Create secure RPC function to upsert tokens (only for edge functions)
CREATE OR REPLACE FUNCTION public.upsert_notion_tokens(
  p_user_id uuid,
  p_access_token text,
  p_workspace_id text DEFAULT NULL,
  p_workspace_name text DEFAULT NULL,
  p_workspace_icon text DEFAULT NULL,
  p_bot_id text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notion_tokens (user_id, access_token_encrypted, workspace_id, workspace_name, workspace_icon, bot_id)
  VALUES (
    p_user_id,
    encrypt_notion_token(p_access_token),
    p_workspace_id,
    p_workspace_name,
    p_workspace_icon,
    p_bot_id
  )
  ON CONFLICT (user_id) DO UPDATE SET
    access_token_encrypted = encrypt_notion_token(p_access_token),
    workspace_id = COALESCE(p_workspace_id, public.notion_tokens.workspace_id),
    workspace_name = COALESCE(p_workspace_name, public.notion_tokens.workspace_name),
    workspace_icon = COALESCE(p_workspace_icon, public.notion_tokens.workspace_icon),
    bot_id = COALESCE(p_bot_id, public.notion_tokens.bot_id),
    updated_at = now();
END;
$$;

-- Create function to delete Notion tokens
CREATE OR REPLACE FUNCTION public.delete_notion_tokens(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.notion_tokens WHERE user_id = p_user_id;
END;
$$;

-- Check if user has valid Notion connection
CREATE OR REPLACE FUNCTION public.check_notion_connection(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.notion_tokens WHERE user_id = p_user_id
  );
END;
$$;

-- Add trigger for updated_at
CREATE TRIGGER update_notion_tokens_updated_at
BEFORE UPDATE ON public.notion_tokens
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Comment for documentation
COMMENT ON TABLE public.notion_tokens IS 'Encrypted Notion OAuth tokens for blueprint import';
