import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, handleCorsOptions } from '../_shared/cors.ts';

interface DisconnectRequest {
  workspace_id: string;
}

const GOOGLE_REVOKE_URL = 'https://oauth2.googleapis.com/revoke';
const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

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

    const body: DisconnectRequest = await req.json();
    const { workspace_id } = body;

    if (!workspace_id) {
      return new Response(JSON.stringify({ error: 'workspace_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get workspace with calendar info
    const { data: workspace, error: workspaceError } = await supabase
      .from('tools_workspaces')
      .select('id, google_calendar_id, google_webhook_channel_id, google_webhook_resource_id')
      .eq('id', workspace_id)
      .single();

    if (workspaceError || !workspace) {
      return new Response(JSON.stringify({ error: 'Workspace not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get tokens for cleanup
    const { data: tokens } = await supabase
      .from('google_calendar_tokens')
      .select('*')
      .eq('workspace_id', workspace_id)
      .maybeSingle();

    if (tokens) {
      // Try to stop webhook channel if exists
      if (workspace.google_webhook_channel_id && workspace.google_webhook_resource_id && workspace.google_calendar_id) {
        try {
          const stopResponse = await fetch(`${GOOGLE_CALENDAR_API}/channels/stop`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${tokens.access_token_encrypted}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              id: workspace.google_webhook_channel_id,
              resourceId: workspace.google_webhook_resource_id,
            }),
          });

          if (!stopResponse.ok) {
            console.log('Failed to stop webhook channel (may already be expired):', await stopResponse.text());
          } else {
            console.log('Webhook channel stopped successfully');
          }
        } catch (error) {
          console.log('Error stopping webhook channel:', error);
        }
      }

      // Try to revoke the token
      try {
        const revokeResponse = await fetch(
          `${GOOGLE_REVOKE_URL}?token=${tokens.access_token_encrypted}`,
          { method: 'POST' }
        );

        if (!revokeResponse.ok) {
          console.log('Failed to revoke token:', await revokeResponse.text());
        } else {
          console.log('Token revoked successfully');
        }
      } catch (error) {
        console.log('Error revoking token:', error);
      }
    }

    // Delete tokens from database
    const { error: deleteTokensError } = await supabase
      .from('google_calendar_tokens')
      .delete()
      .eq('workspace_id', workspace_id);

    if (deleteTokensError) {
      console.error('Failed to delete tokens:', deleteTokensError);
    }

    // Clear workspace calendar fields
    const { error: updateError } = await supabase
      .from('tools_workspaces')
      .update({
        google_calendar_id: null,
        google_calendar_name: null,
        google_connected_at: null,
        google_connected_by: null,
        google_webhook_channel_id: null,
        google_webhook_resource_id: null,
        google_webhook_expiration: null,
        google_sync_token: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', workspace_id);

    if (updateError) {
      console.error('Failed to update workspace:', updateError);
      return new Response(JSON.stringify({ error: 'Failed to disconnect' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Optionally: Clear google_event_id from all events (keep local events)
    // Or we can leave them as-is so they can be re-synced if reconnected
    // For now, we'll leave them

    console.log('Google Calendar disconnected successfully for workspace:', workspace_id);

    return new Response(JSON.stringify({
      success: true,
      message: 'Google Calendar disconnected successfully',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in google-calendar-disconnect:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
