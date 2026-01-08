import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

export function DiscordBotOAuthCallback() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'error' | 'success'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [guildName, setGuildName] = useState('');
  const hasProcessed = useRef(false);

  useEffect(() => {
    const handleCallback = async () => {
      // Prevent double processing
      if (hasProcessed.current) return;
      hasProcessed.current = true;

      const code = searchParams.get('code');
      const guildId = searchParams.get('guild_id');
      const state = searchParams.get('state');
      const error = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      // Handle OAuth error
      if (error) {
        const errMsg = errorDescription || error || 'Authorization was denied';
        if (window.opener) {
          window.opener.postMessage({
            type: 'discord-bot-oauth-error',
            error: errMsg
          }, window.location.origin);
          setTimeout(() => window.close(), 100);
          return;
        }
        setStatus('error');
        setErrorMessage(errMsg);
        return;
      }

      // Parse state to get brandId
      let brandId: string | null = null;
      try {
        if (state) {
          const stateData = JSON.parse(atob(state));
          brandId = stateData.brandId;
        }
      } catch (e) {
        console.error('Failed to parse state:', e);
      }

      if (!guildId) {
        const errMsg = 'No server was selected. Please try again and select a server.';
        if (window.opener) {
          window.opener.postMessage({
            type: 'discord-bot-oauth-error',
            error: errMsg
          }, window.location.origin);
          setTimeout(() => window.close(), 100);
          return;
        }
        setStatus('error');
        setErrorMessage(errMsg);
        return;
      }

      if (!brandId) {
        const errMsg = 'Invalid state parameter. Please try again.';
        if (window.opener) {
          window.opener.postMessage({
            type: 'discord-bot-oauth-error',
            error: errMsg
          }, window.location.origin);
          setTimeout(() => window.close(), 100);
          return;
        }
        setStatus('error');
        setErrorMessage(errMsg);
        return;
      }

      try {
        // Call edge function to verify bot is in guild and update brand
        const { data, error: functionError } = await supabase.functions.invoke('discord-bot-oauth', {
          body: {
            action: 'connect',
            code,
            guildId,
            brandId,
          }
        });

        if (functionError) {
          throw new Error(functionError.message || 'Failed to connect Discord server');
        }

        if (data?.error) {
          throw new Error(data.error);
        }

        setGuildName(data?.guild?.name || 'Discord Server');
        setStatus('success');

        // Send success message to parent window
        if (window.opener) {
          window.opener.postMessage({
            type: 'discord-bot-oauth-success',
            data
          }, window.location.origin);
          setTimeout(() => window.close(), 1500);
        }
      } catch (error: any) {
        console.error('Error connecting Discord server:', error);
        const errMsg = error?.message || 'Failed to connect Discord server';
        if (window.opener) {
          window.opener.postMessage({
            type: 'discord-bot-oauth-error',
            error: errMsg
          }, window.location.origin);
          setTimeout(() => window.close(), 100);
          return;
        }
        setStatus('error');
        setErrorMessage(errMsg);
      }
    };

    handleCallback();
  }, [searchParams]);

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4 max-w-md px-4">
          <XCircle className="h-12 w-12 text-destructive mx-auto" />
          <h1 className="text-xl font-semibold">Connection Failed</h1>
          <p className="text-muted-foreground">{errorMessage}</p>
          <p className="text-sm text-muted-foreground">
            You can close this window and try again.
          </p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4 max-w-md px-4">
          <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
          <h1 className="text-xl font-semibold">Server Connected!</h1>
          <p className="text-muted-foreground">
            <strong>{guildName}</strong> has been connected to your workspace.
          </p>
          <p className="text-sm text-muted-foreground">
            This window will close automatically...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-[#5865F2]" />
        <p className="text-muted-foreground">
          Connecting your Discord server...
        </p>
      </div>
    </div>
  );
}
