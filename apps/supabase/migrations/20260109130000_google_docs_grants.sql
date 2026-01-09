-- Grant execute permissions on Google Docs RPC functions
-- These are needed for the Edge Functions to call the RPC functions

GRANT EXECUTE ON FUNCTION public.check_google_docs_connection(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_google_docs_connection(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_google_docs_tokens(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.upsert_google_docs_tokens(uuid, text, text, timestamptz, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_google_docs_tokens(uuid) TO service_role;
