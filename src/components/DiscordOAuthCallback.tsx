import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export function DiscordOAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'error' | 'success'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const hasProcessed = useRef(false);

  useEffect(() => {
    const handleCallback = async () => {
      // Prevent double processing
      if (hasProcessed.current) return;
      hasProcessed.current = true;

      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');

      // Handle OAuth error
      if (error) {
        // Check if this is a popup for account linking
        if (window.opener) {
          window.opener.postMessage({
            type: 'discord-oauth-error',
            error: error
          }, window.location.origin);
          window.close();
          return;
        }
        setStatus('error');
        setErrorMessage(error);
        setTimeout(() => navigate('/auth'), 3000);
        return;
      }

      if (!code) {
        if (window.opener) {
          window.opener.postMessage({
            type: 'discord-oauth-error',
            error: 'Missing authorization code'
          }, window.location.origin);
          window.close();
          return;
        }
        setStatus('error');
        setErrorMessage('Missing authorization code');
        setTimeout(() => navigate('/auth'), 3000);
        return;
      }

      // Parse state to determine if this is account linking or auth
      let stateData: { userId?: string; action?: string } = {};
      try {
        if (state) {
          stateData = JSON.parse(atob(state));
        }
      } catch (e) {
        console.error('Failed to parse state:', e);
      }

      // If we have a userId in state, this is account linking (popup flow)
      if (stateData.userId && window.opener) {
        try {
          const redirectUri = `${window.location.origin}/discord/callback`;
          
          // Exchange code for Discord user data (account linking)
          const { data, error: functionError } = await supabase.functions.invoke('discord-oauth', {
            body: { code, userId: stateData.userId, redirectUri }
          });

          if (functionError) throw functionError;

          // Send success message to parent window
          window.opener.postMessage({
            type: 'discord-oauth-success',
            data
          }, window.location.origin);
          
          window.close();
        } catch (error: any) {
          console.error('Error linking Discord:', error);
          window.opener.postMessage({
            type: 'discord-oauth-error',
            error: error.message
          }, window.location.origin);
          window.close();
        }
        return;
      }

      // This is authentication flow (not popup)
      try {
        setStatus('loading');
        // Use the EXACT same redirect URI that was used in the authorization request
        const redirectUri = 'https://virality.gg/discord/callback';
        
        // Call the discord-auth function to sign in/up
        const { data, error: functionError } = await supabase.functions.invoke('discord-auth', {
          body: { code, redirectUri }
        });

        if (functionError) throw functionError;

        if (data.success && data.actionLink) {
          // Redirect to the magic link to complete sign in
          window.location.href = data.actionLink;
        } else {
          throw new Error('Failed to authenticate with Discord');
        }
      } catch (error: any) {
        console.error('Error authenticating with Discord:', error);
        setStatus('error');
        setErrorMessage(error.message || 'Failed to authenticate with Discord');
        setTimeout(() => navigate('/auth'), 3000);
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <p className="text-destructive">Error: {errorMessage}</p>
          <p className="text-muted-foreground">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="text-muted-foreground">
          {status === 'loading' ? 'Authenticating with Discord...' : 'Redirecting...'}
        </p>
      </div>
    </div>
  );
}
