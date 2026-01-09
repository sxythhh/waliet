import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, handleCorsOptions } from '../_shared/cors.ts';

interface AuthRequest {
  action: 'get_auth_url' | 'exchange_code';
  workspace_id: string;
  code?: string;
  redirect_uri?: string;
  state?: string;
}

interface GoogleTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

interface GoogleCalendarListResponse {
  items: Array<{
    id: string;
    summary: string;
    primary?: boolean;
    accessRole: string;
  }>;
}

const GOOGLE_OAUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

// Scopes needed for calendar read/write
const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
].join(' ');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCorsOptions(req);
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate admin authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user is admin
    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!adminProfile?.is_admin) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: AuthRequest = await req.json();
    const { action, workspace_id, code, redirect_uri, state } = body;

    if (!workspace_id) {
      return new Response(JSON.stringify({ error: 'workspace_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify workspace exists
    const { data: workspace, error: workspaceError } = await supabase
      .from('tools_workspaces')
      .select('id, name, google_calendar_id')
      .eq('id', workspace_id)
      .single();

    if (workspaceError || !workspace) {
      return new Response(JSON.stringify({ error: 'Workspace not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
    const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      console.error('Missing Google OAuth credentials');
      return new Response(JSON.stringify({ error: 'Google OAuth not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'get_auth_url') {
      // Generate a secure state parameter for CSRF protection
      const stateData = JSON.stringify({
        workspace_id,
        user_id: user.id,
        nonce: crypto.randomUUID(),
        timestamp: Date.now(),
      });
      const encodedState = btoa(stateData);

      // Build the OAuth URL
      const params = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri: redirect_uri || `${Deno.env.get('PUBLIC_SITE_URL') || 'https://virality.gg'}/google/calendar-callback`,
        response_type: 'code',
        scope: SCOPES,
        access_type: 'offline', // Get refresh token
        prompt: 'consent', // Force consent to get refresh token
        state: encodedState,
      });

      const authUrl = `${GOOGLE_OAUTH_URL}?${params.toString()}`;

      return new Response(JSON.stringify({
        success: true,
        auth_url: authUrl,
        state: encodedState,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'exchange_code') {
      if (!code) {
        return new Response(JSON.stringify({ error: 'Authorization code is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!redirect_uri) {
        return new Response(JSON.stringify({ error: 'redirect_uri is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Validate state parameter for CSRF protection (MANDATORY)
      if (!state) {
        console.error('Missing state parameter - potential CSRF attack');
        return new Response(JSON.stringify({ error: 'Missing state parameter' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      try {
        const stateData = JSON.parse(atob(state));

        // Validate required fields
        if (!stateData.workspace_id || !stateData.user_id || !stateData.nonce || !stateData.timestamp) {
          throw new Error('Missing required state fields');
        }

        if (stateData.workspace_id !== workspace_id) {
          console.error('Workspace ID mismatch in state parameter');
          return new Response(JSON.stringify({ error: 'Invalid state parameter' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Verify user matches the authenticated user
        if (stateData.user_id !== user.id) {
          console.error('User ID mismatch in state parameter - potential CSRF attack');
          return new Response(JSON.stringify({ error: 'Invalid state parameter' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Check timestamp (3 minute expiry for better security)
        if (Date.now() - stateData.timestamp > 3 * 60 * 1000) {
          return new Response(JSON.stringify({ error: 'State parameter expired' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      } catch (parseError) {
        console.error('Failed to parse state parameter:', parseError);
        return new Response(JSON.stringify({ error: 'Invalid state parameter format' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Exchange authorization code for tokens
      const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          code,
          grant_type: 'authorization_code',
          redirect_uri,
        }),
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.text();
        console.error('Google token exchange failed:', errorData);
        return new Response(JSON.stringify({ error: 'Failed to exchange authorization code' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const tokens: GoogleTokenResponse = await tokenResponse.json();
      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

      console.log('Token exchange successful, fetching calendars...');

      // Fetch user's calendars to get the primary calendar
      const calendarsResponse = await fetch(`${GOOGLE_CALENDAR_API}/users/me/calendarList`, {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
      });

      if (!calendarsResponse.ok) {
        console.error('Failed to fetch calendars:', await calendarsResponse.text());
        return new Response(JSON.stringify({ error: 'Failed to fetch Google calendars' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const calendars: GoogleCalendarListResponse = await calendarsResponse.json();

      // Use primary calendar or first calendar with owner/writer access
      const primaryCalendar = calendars.items.find(c => c.primary) ||
        calendars.items.find(c => ['owner', 'writer'].includes(c.accessRole));

      if (!primaryCalendar) {
        return new Response(JSON.stringify({ error: 'No writable calendar found' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log('Using calendar:', primaryCalendar.summary);

      // TODO: Encrypt tokens using Supabase Vault before storing
      // For now, tokens are stored directly. The database has RLS protection,
      // but tokens should be encrypted at rest using Vault for production.
      // See: https://supabase.com/docs/guides/database/vault
      //
      // The column names include "_encrypted" suffix to remind that encryption
      // should be implemented. Once Vault is set up, use:
      //   vault.create_secret('token', tokens.access_token)
      //   vault.create_secret('token', tokens.refresh_token)

      // Store tokens (upsert)
      const { error: tokenStoreError } = await supabase
        .from('google_calendar_tokens')
        .upsert({
          workspace_id,
          access_token_encrypted: tokens.access_token,
          refresh_token_encrypted: tokens.refresh_token,
          token_expires_at: expiresAt,
          scope: tokens.scope,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'workspace_id',
        });

      if (tokenStoreError) {
        console.error('Failed to store tokens:', tokenStoreError);
        return new Response(JSON.stringify({ error: 'Failed to store tokens' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Update workspace with calendar info
      const { error: workspaceUpdateError } = await supabase
        .from('tools_workspaces')
        .update({
          google_calendar_id: primaryCalendar.id,
          google_calendar_name: primaryCalendar.summary,
          google_connected_at: new Date().toISOString(),
          google_connected_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', workspace_id);

      if (workspaceUpdateError) {
        console.error('Failed to update workspace:', workspaceUpdateError);
        return new Response(JSON.stringify({ error: 'Failed to update workspace' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log('Google Calendar connected successfully');

      return new Response(JSON.stringify({
        success: true,
        message: 'Google Calendar connected successfully',
        calendar: {
          id: primaryCalendar.id,
          name: primaryCalendar.summary,
        },
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in google-calendar-auth:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
