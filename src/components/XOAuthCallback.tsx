import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export function XOAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');

      // Handle OAuth error
      if (error) {
        if (window.opener) {
          window.opener.postMessage({
            type: 'x-oauth-error',
            error: error
          }, window.location.origin);
        }
        window.close();
        return;
      }

      // Get user ID and returnTo from state
      let userId, returnTo;
      try {
        const stateData = JSON.parse(atob(state || ''));
        userId = stateData.userId;
        returnTo = stateData.returnTo; // 'social_accounts' or undefined
      } catch (e) {
        console.error('Failed to parse state:', e);
        if (window.opener) {
          window.opener.postMessage({
            type: 'x-oauth-error',
            error: 'Invalid state parameter'
          }, window.location.origin);
        }
        window.close();
        return;
      }

      if (!code || !userId) {
        if (window.opener) {
          window.opener.postMessage({
            type: 'x-oauth-error',
            error: 'Missing authorization code or user ID'
          }, window.location.origin);
        }
        window.close();
        return;
      }

      try {
        // Exchange code for X user data
        const { data, error: functionError } = await supabase.functions.invoke('x-oauth', {
          body: { code, userId, returnTo }
        });

        if (functionError) throw functionError;

        // Send success message to parent window
        if (window.opener) {
          window.opener.postMessage({
            type: 'x-oauth-success',
            data
          }, window.location.origin);
        }
        
        window.close();
      } catch (error: any) {
        console.error('Error linking X:', error);
        if (window.opener) {
          window.opener.postMessage({
            type: 'x-oauth-error',
            error: error.message
          }, window.location.origin);
        }
        window.close();
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="text-muted-foreground">Connecting your X account...</p>
      </div>
    </div>
  );
}
