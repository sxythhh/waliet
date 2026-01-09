
-- Fix prevent_self_role_grant function to include search_path
-- This addresses the "Function Search Path Mutable" security warning

CREATE OR REPLACE FUNCTION public.prevent_self_role_grant()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'  -- Add search_path for security
AS $function$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.user_id = auth.uid() THEN
    RAISE EXCEPTION 'Users cannot grant roles to themselves';
  END IF;
  
  RETURN NEW;
END;
$function$;
