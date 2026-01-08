import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { restoreTrackingFromOAuth, getStoredUtmParams, clearStoredUtmParams, UtmParams } from "@/hooks/useUtmTracking";
import { useReferralTracking } from "@/hooks/useReferralTracking";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { z } from "zod";

// Zod schema for validating OAuth state parameter
const OAuthStateSchema = z.object({
  userId: z.string().uuid().optional(),
  action: z.string().optional(),
  nonce: z.string().optional(),
});

// Save UTM params to profile for OAuth signups
const saveUtmToProfile = async (userId: string, utmParams: UtmParams | null) => {
  if (!utmParams) return;

  const updateData: Record<string, string | null> = {};
  if (utmParams.utm_source) updateData.utm_source = utmParams.utm_source;
  if (utmParams.utm_medium) updateData.utm_medium = utmParams.utm_medium;
  if (utmParams.utm_campaign) updateData.utm_campaign = utmParams.utm_campaign;
  if (utmParams.utm_content) updateData.utm_content = utmParams.utm_content;
  if (utmParams.utm_term) updateData.utm_term = utmParams.utm_term;
  if (utmParams.signup_url) updateData.signup_url = utmParams.signup_url;

  if (Object.keys(updateData).length === 0) return;

  try {
    await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", userId);
  } catch (error) {
    console.error("Failed to save UTM params:", error);
  }
};

export function DiscordOAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'error' | 'success'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [requestId] = useState(() => crypto.randomUUID()); // Unique ID for this component instance
  const { trackReferral } = useReferralTracking();
  const { toast } = useToast();

  useEffect(() => {
    // Use AbortController for proper cleanup with React 18 Strict Mode
    const abortController = new AbortController();
    let isProcessed = false;

    const handleCallback = async () => {
      // Check if already aborted or processed
      if (abortController.signal.aborted || isProcessed) return;
      isProcessed = true;

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

      // Parse and validate state to determine if this is account linking or auth
      let stateData: z.infer<typeof OAuthStateSchema> = {};
      try {
        if (state) {
          const rawState = JSON.parse(atob(state));
          // Validate with Zod schema
          const parseResult = OAuthStateSchema.safeParse(rawState);
          if (parseResult.success) {
            stateData = parseResult.data;
          } else {
            console.error('Invalid OAuth state structure:', parseResult.error.issues);
            // Continue with empty state - will fall through to auth flow
          }
        }
      } catch (e) {
        console.error('Failed to parse state:', e);
        // Continue with empty state - will fall through to auth flow
      }

      // If we have a userId in state, this is account linking (popup flow)
      if (stateData.userId && window.opener) {
        // Verify CSRF nonce for account linking flow
        const storedNonce = sessionStorage.getItem('discord_oauth_nonce');
        sessionStorage.removeItem('discord_oauth_nonce'); // Clear immediately

        if (!stateData.nonce || !storedNonce || stateData.nonce !== storedNonce) {
          console.error('OAuth state nonce mismatch - potential CSRF attack');
          window.opener.postMessage({
            type: 'discord-oauth-error',
            error: 'Security verification failed. Please try again.'
          }, window.location.origin);
          window.close();
          return;
        }
        try {
          const redirectUri = `${window.location.origin}/discord/callback`;

          // Exchange code for Discord user data (account linking)
          const { data, error: functionError } = await supabase.functions.invoke('discord-oauth', {
            body: { code, userId: stateData.userId, redirectUri }
          });

          // Check for error in the response data (edge function returns error in body for 4xx/5xx)
          if (data?.error) {
            throw new Error(data.error);
          }

          if (functionError) {
            let msg = functionError.message || 'Failed to link Discord account';
            // Try to extract error message from FunctionsHttpError
            if (functionError.name === 'FunctionsHttpError') {
              try {
                const errorBody = await (functionError as any).context?.json?.();
                if (errorBody?.error) msg = errorBody.error;
              } catch {
                // If json parsing fails, try to get the message from context
                const context = (functionError as any).context;
                if (context?.error) msg = context.error;
              }
            }
            throw new Error(msg);
          }

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
            error: error?.message || 'Failed to link Discord account'
          }, window.location.origin);
          window.close();
        }
        return;
      }

      // This is authentication flow (not popup)
      try {
        setStatus('loading');

        // Restore tracking params from sessionStorage
        restoreTrackingFromOAuth();

        // Must exactly match the redirect_uri used in the initial authorize URL
        const redirectUri = `${window.location.origin}/discord/callback`;
        console.log('Calling discord-auth with redirectUri:', redirectUri);

        // Call the discord-auth function to sign in/up
        const { data, error: functionError } = await supabase.functions.invoke('discord-auth', {
          body: { code, redirectUri }
        });

        console.log('Discord auth response:', { data, functionError });

        // Check for error in data (edge function might return error in body)
        if (data?.error) {
          throw new Error(data.error);
        }

        if (functionError) {
          // Try to extract more detailed error message
          let errorMsg = functionError.message || 'Unknown error';
          if (functionError.name === 'FunctionsHttpError') {
            try {
              const context = (functionError as any).context;
              if (context?.json) {
                const errorBody = await context.json();
                if (errorBody?.error) errorMsg = errorBody.error;
              }
            } catch (e) {
              console.error('Failed to parse error context:', e);
            }
          }
          throw new Error(errorMsg);
        }

        if (data.success && data.actionLink) {
          // Check if this is a new user signup
          if (data.isNewUser && data.userId) {
            // Save UTM params to profile (OAuth doesn't pass them via metadata)
            const utmParams = getStoredUtmParams();
            await saveUtmToProfile(data.userId, utmParams);

            const referralResult = await trackReferral(data.userId);
            clearStoredUtmParams();

            if (referralResult.success) {
              toast({
                title: "Welcome to Virality!",
                description: "Referral applied successfully."
              });
            } else if (referralResult.error) {
              toast({
                variant: "destructive",
                title: "Referral Error",
                description: referralResult.error
              });
            }
          }

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

    // Cleanup function to abort if component unmounts (React 18 Strict Mode)
    return () => {
      abortController.abort();
    };
  }, [searchParams, navigate, trackReferral, toast, requestId]);

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
