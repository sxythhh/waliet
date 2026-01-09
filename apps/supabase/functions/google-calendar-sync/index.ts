import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, handleCorsOptions } from '../_shared/cors.ts';

interface SyncRequest {
  action: 'push_event' | 'pull_events' | 'delete_event' | 'refresh_token';
  workspace_id: string;
  event_id?: string;
  event_data?: {
    title: string;
    description?: string;
    start_time: string;
    end_time: string;
    all_day?: boolean;
    location?: string;
  };
  google_event_id?: string;
}

interface GoogleEvent {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  start: { dateTime?: string; date?: string; timeZone?: string };
  end: { dateTime?: string; date?: string; timeZone?: string };
  updated: string;
  status: string;
  extendedProperties?: {
    private?: Record<string, string>;
  };
}

interface GoogleEventsListResponse {
  items?: GoogleEvent[];
  nextSyncToken?: string;
  nextPageToken?: string;
}

const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

// Helper to refresh access token
async function refreshAccessToken(
  supabase: ReturnType<typeof createClient>,
  workspaceId: string
): Promise<string | null> {
  const { data: tokens, error } = await supabase
    .from('google_calendar_tokens')
    .select('*')
    .eq('workspace_id', workspaceId)
    .single();

  if (error || !tokens) {
    console.error('No tokens found for workspace:', workspaceId);
    return null;
  }

  // Check if token is still valid (with 5 minute buffer)
  const expiresAt = new Date(tokens.token_expires_at);
  if (expiresAt.getTime() - Date.now() > 5 * 60 * 1000) {
    return tokens.access_token_encrypted;
  }

  // Token expired, refresh it
  console.log('Token expired, refreshing...');

  const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
  const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID!,
      client_secret: GOOGLE_CLIENT_SECRET!,
      refresh_token: tokens.refresh_token_encrypted,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    console.error('Failed to refresh token:', await response.text());
    return null;
  }

  const newTokens = await response.json();
  const newExpiresAt = new Date(Date.now() + newTokens.expires_in * 1000).toISOString();

  // Update stored tokens
  await supabase
    .from('google_calendar_tokens')
    .update({
      access_token_encrypted: newTokens.access_token,
      token_expires_at: newExpiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq('workspace_id', workspaceId);

  return newTokens.access_token;
}

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
    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!adminUser) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: SyncRequest = await req.json();
    const { action, workspace_id, event_id, event_data, google_event_id } = body;

    if (!workspace_id) {
      return new Response(JSON.stringify({ error: 'workspace_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get workspace with calendar info
    const { data: workspace, error: workspaceError } = await supabase
      .from('tools_workspaces')
      .select('id, google_calendar_id, google_sync_token')
      .eq('id', workspace_id)
      .single();

    if (workspaceError || !workspace) {
      return new Response(JSON.stringify({ error: 'Workspace not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!workspace.google_calendar_id) {
      return new Response(JSON.stringify({ error: 'Google Calendar not connected' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get fresh access token
    const accessToken = await refreshAccessToken(supabase, workspace_id);
    if (!accessToken) {
      return new Response(JSON.stringify({ error: 'Failed to get access token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const calendarId = encodeURIComponent(workspace.google_calendar_id);

    // Handle actions
    if (action === 'push_event') {
      if (!event_data) {
        return new Response(JSON.stringify({ error: 'event_data is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Build Google Calendar event
      const googleEvent: Record<string, unknown> = {
        summary: event_data.title,
        description: event_data.description || '',
        location: event_data.location || '',
      };

      if (event_data.all_day) {
        // All-day events use date instead of dateTime
        googleEvent.start = { date: event_data.start_time.split('T')[0] };
        googleEvent.end = { date: event_data.end_time.split('T')[0] };
      } else {
        googleEvent.start = { dateTime: event_data.start_time, timeZone: 'UTC' };
        googleEvent.end = { dateTime: event_data.end_time, timeZone: 'UTC' };
      }

      // Store Virality event ID in extended properties for reverse lookup
      if (event_id) {
        googleEvent.extendedProperties = {
          private: { virality_event_id: event_id },
        };
      }

      let response: Response;
      let method: string;
      let url: string;

      if (google_event_id) {
        // Update existing event
        url = `${GOOGLE_CALENDAR_API}/calendars/${calendarId}/events/${google_event_id}`;
        method = 'PUT';
      } else {
        // Create new event
        url = `${GOOGLE_CALENDAR_API}/calendars/${calendarId}/events`;
        method = 'POST';
      }

      response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(googleEvent),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to push event to Google:', errorText);
        return new Response(JSON.stringify({ error: 'Failed to push event to Google Calendar' }), {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const createdEvent: GoogleEvent = await response.json();

      // Update local event with Google event ID
      if (event_id && !google_event_id) {
        await supabase
          .from('tools_events')
          .update({ google_event_id: createdEvent.id })
          .eq('id', event_id);
      }

      console.log('Event pushed to Google:', createdEvent.id);

      return new Response(JSON.stringify({
        success: true,
        google_event_id: createdEvent.id,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'delete_event') {
      if (!google_event_id) {
        return new Response(JSON.stringify({ error: 'google_event_id is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const response = await fetch(
        `${GOOGLE_CALENDAR_API}/calendars/${calendarId}/events/${google_event_id}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      // 404 or 410 means event already deleted, which is fine
      if (!response.ok && response.status !== 404 && response.status !== 410) {
        console.error('Failed to delete event from Google:', await response.text());
        return new Response(JSON.stringify({ error: 'Failed to delete event from Google Calendar' }), {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log('Event deleted from Google:', google_event_id);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'pull_events') {
      // Use incremental sync if we have a sync token
      const params = new URLSearchParams({
        singleEvents: 'true',
        orderBy: 'updated',
      });

      if (workspace.google_sync_token) {
        params.set('syncToken', workspace.google_sync_token);
      } else {
        // First sync: get events from past month to 6 months ahead
        const timeMin = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const timeMax = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString();
        params.set('timeMin', timeMin);
        params.set('timeMax', timeMax);
      }

      let allEvents: GoogleEvent[] = [];
      let nextPageToken: string | undefined;
      let nextSyncToken: string | undefined;

      do {
        if (nextPageToken) {
          params.set('pageToken', nextPageToken);
        }

        const response = await fetch(
          `${GOOGLE_CALENDAR_API}/calendars/${calendarId}/events?${params.toString()}`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        if (!response.ok) {
          // If sync token is invalid, clear it and do a full sync
          if (response.status === 410) {
            console.log('Sync token expired, doing full sync...');
            await supabase
              .from('tools_workspaces')
              .update({ google_sync_token: null })
              .eq('id', workspace_id);

            return new Response(JSON.stringify({
              success: false,
              error: 'Sync token expired',
              retry: true,
            }), {
              status: 410,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          console.error('Failed to fetch events from Google:', await response.text());
          return new Response(JSON.stringify({ error: 'Failed to fetch events from Google Calendar' }), {
            status: response.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const data: GoogleEventsListResponse = await response.json();
        if (data.items) {
          allEvents = allEvents.concat(data.items);
        }
        nextPageToken = data.nextPageToken;
        nextSyncToken = data.nextSyncToken;
      } while (nextPageToken);

      // Process events
      const created: string[] = [];
      const updated: string[] = [];
      const deleted: string[] = [];

      for (const googleEvent of allEvents) {
        // Skip cancelled events - delete locally
        if (googleEvent.status === 'cancelled') {
          // Find and delete local event
          const { data: localEvent } = await supabase
            .from('tools_events')
            .select('id')
            .eq('google_event_id', googleEvent.id)
            .eq('workspace_id', workspace_id)
            .maybeSingle();

          if (localEvent) {
            await supabase
              .from('tools_events')
              .delete()
              .eq('id', localEvent.id);
            deleted.push(localEvent.id);
          }
          continue;
        }

        // Check if event exists locally
        const { data: existingEvent } = await supabase
          .from('tools_events')
          .select('id, updated_at')
          .eq('google_event_id', googleEvent.id)
          .eq('workspace_id', workspace_id)
          .maybeSingle();

        // Also check by virality_event_id
        let viralityEventId = googleEvent.extendedProperties?.private?.virality_event_id;
        if (!existingEvent && viralityEventId) {
          const { data: eventById } = await supabase
            .from('tools_events')
            .select('id, updated_at, google_event_id')
            .eq('id', viralityEventId)
            .eq('workspace_id', workspace_id)
            .maybeSingle();

          if (eventById && !eventById.google_event_id) {
            // Link the Google event ID
            await supabase
              .from('tools_events')
              .update({ google_event_id: googleEvent.id })
              .eq('id', eventById.id);
            updated.push(eventById.id);
            continue;
          }
        }

        // Determine start/end times
        const isAllDay = !!googleEvent.start.date;
        const startTime = googleEvent.start.dateTime || `${googleEvent.start.date}T00:00:00Z`;
        const endTime = googleEvent.end.dateTime || `${googleEvent.end.date}T23:59:59Z`;

        const eventData = {
          workspace_id,
          title: googleEvent.summary || 'Untitled Event',
          description: googleEvent.description || null,
          location: googleEvent.location || null,
          start_time: startTime,
          end_time: endTime,
          all_day: isAllDay,
          google_event_id: googleEvent.id,
          updated_at: googleEvent.updated,
        };

        if (existingEvent) {
          // Update if Google version is newer (last-write-wins)
          const googleUpdated = new Date(googleEvent.updated);
          const localUpdated = new Date(existingEvent.updated_at);

          if (googleUpdated > localUpdated) {
            await supabase
              .from('tools_events')
              .update(eventData)
              .eq('id', existingEvent.id);
            updated.push(existingEvent.id);
          }
        } else {
          // Create new local event
          const { data: newEvent } = await supabase
            .from('tools_events')
            .insert(eventData)
            .select('id')
            .single();

          if (newEvent) {
            created.push(newEvent.id);
          }
        }
      }

      // Save new sync token
      if (nextSyncToken) {
        await supabase
          .from('tools_workspaces')
          .update({
            google_sync_token: nextSyncToken,
            updated_at: new Date().toISOString(),
          })
          .eq('id', workspace_id);
      }

      console.log(`Pull complete: ${created.length} created, ${updated.length} updated, ${deleted.length} deleted`);

      return new Response(JSON.stringify({
        success: true,
        created: created.length,
        updated: updated.length,
        deleted: deleted.length,
        sync_token_saved: !!nextSyncToken,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in google-calendar-sync:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
