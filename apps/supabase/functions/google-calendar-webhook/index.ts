import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// This webhook receives push notifications from Google Calendar
// It must be publicly accessible (no auth required)
// Google sends notifications when calendar events change

Deno.serve(async (req) => {
  // Handle sync verification from Google
  // When setting up a watch, Google sends a sync message first
  const channelId = req.headers.get('X-Goog-Channel-ID');
  const resourceId = req.headers.get('X-Goog-Resource-ID');
  const resourceState = req.headers.get('X-Goog-Resource-State');
  const channelExpiration = req.headers.get('X-Goog-Channel-Expiration');

  console.log('Google Calendar webhook received:', {
    channelId,
    resourceId,
    resourceState,
    channelExpiration,
  });

  // Acknowledge immediately - Google expects a 200 response quickly
  // We'll process asynchronously if needed

  if (!channelId || !resourceId) {
    console.log('Missing channel or resource ID, ignoring');
    return new Response('OK', { status: 200 });
  }

  // Handle sync message (initial setup verification)
  if (resourceState === 'sync') {
    console.log('Received sync verification message');
    return new Response('OK', { status: 200 });
  }

  // Only process 'exists' state (changes to the calendar)
  if (resourceState !== 'exists') {
    console.log(`Ignoring resource state: ${resourceState}`);
    return new Response('OK', { status: 200 });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find workspace by webhook channel ID
    const { data: workspace, error: workspaceError } = await supabase
      .from('tools_workspaces')
      .select('id, google_calendar_id, google_webhook_channel_id, google_webhook_resource_id')
      .eq('google_webhook_channel_id', channelId)
      .maybeSingle();

    if (workspaceError) {
      console.error('Error looking up workspace:', workspaceError);
      return new Response('OK', { status: 200 });
    }

    if (!workspace) {
      console.log('No workspace found for channel:', channelId);
      // Channel might have been cleaned up, return 200 anyway
      return new Response('OK', { status: 200 });
    }

    // Verify resource ID matches
    if (workspace.google_webhook_resource_id !== resourceId) {
      console.log('Resource ID mismatch, ignoring');
      return new Response('OK', { status: 200 });
    }

    console.log('Processing webhook for workspace:', workspace.id);

    // Queue a sync operation
    // In a production environment, you might want to use a queue system
    // For now, we'll record that a sync is needed

    // Option 1: Trigger sync immediately (might be slow)
    // This is fine for low volume, but for high volume consider a queue

    // Get tokens and refresh if needed
    const { data: tokens, error: tokensError } = await supabase
      .from('google_calendar_tokens')
      .select('*')
      .eq('workspace_id', workspace.id)
      .single();

    if (tokensError || !tokens) {
      console.error('No tokens found for workspace');
      return new Response('OK', { status: 200 });
    }

    // Check if token needs refresh
    let accessToken = tokens.access_token_encrypted;
    const expiresAt = new Date(tokens.token_expires_at);

    if (expiresAt.getTime() - Date.now() < 5 * 60 * 1000) {
      // Token expired or about to expire, refresh it
      const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
      const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');

      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID!,
          client_secret: GOOGLE_CLIENT_SECRET!,
          refresh_token: tokens.refresh_token_encrypted,
          grant_type: 'refresh_token',
        }),
      });

      if (tokenResponse.ok) {
        const newTokens = await tokenResponse.json();
        accessToken = newTokens.access_token;
        const newExpiresAt = new Date(Date.now() + newTokens.expires_in * 1000).toISOString();

        await supabase
          .from('google_calendar_tokens')
          .update({
            access_token_encrypted: accessToken,
            token_expires_at: newExpiresAt,
            updated_at: new Date().toISOString(),
          })
          .eq('workspace_id', workspace.id);
      } else {
        console.error('Failed to refresh token');
        return new Response('OK', { status: 200 });
      }
    }

    // Perform incremental sync
    const calendarId = encodeURIComponent(workspace.google_calendar_id!);

    // Get sync token
    const { data: workspaceWithToken } = await supabase
      .from('tools_workspaces')
      .select('google_sync_token')
      .eq('id', workspace.id)
      .single();

    const params = new URLSearchParams({
      singleEvents: 'true',
      orderBy: 'updated',
    });

    if (workspaceWithToken?.google_sync_token) {
      params.set('syncToken', workspaceWithToken.google_sync_token);
    } else {
      // No sync token, get recent events
      const timeMin = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      params.set('timeMin', timeMin);
    }

    const eventsResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?${params.toString()}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!eventsResponse.ok) {
      if (eventsResponse.status === 410) {
        // Sync token expired, clear it
        await supabase
          .from('tools_workspaces')
          .update({ google_sync_token: null })
          .eq('id', workspace.id);
        console.log('Sync token expired, cleared');
      } else {
        console.error('Failed to fetch events:', await eventsResponse.text());
      }
      return new Response('OK', { status: 200 });
    }

    const eventsData = await eventsResponse.json();
    const events = eventsData.items || [];

    console.log(`Processing ${events.length} events from webhook`);

    // Process each event
    for (const googleEvent of events) {
      if (googleEvent.status === 'cancelled') {
        // Delete local event
        await supabase
          .from('tools_events')
          .delete()
          .eq('google_event_id', googleEvent.id)
          .eq('workspace_id', workspace.id);
        continue;
      }

      // Check if event exists locally
      const { data: existingEvent } = await supabase
        .from('tools_events')
        .select('id, updated_at')
        .eq('google_event_id', googleEvent.id)
        .eq('workspace_id', workspace.id)
        .maybeSingle();

      const isAllDay = !!googleEvent.start.date;
      const startTime = googleEvent.start.dateTime || `${googleEvent.start.date}T00:00:00Z`;
      const endTime = googleEvent.end.dateTime || `${googleEvent.end.date}T23:59:59Z`;

      const eventData = {
        workspace_id: workspace.id,
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
        // Update if Google version is newer
        const googleUpdated = new Date(googleEvent.updated);
        const localUpdated = new Date(existingEvent.updated_at);

        if (googleUpdated > localUpdated) {
          await supabase
            .from('tools_events')
            .update(eventData)
            .eq('id', existingEvent.id);
        }
      } else {
        // Create new local event
        await supabase
          .from('tools_events')
          .insert(eventData);
      }
    }

    // Save new sync token
    if (eventsData.nextSyncToken) {
      await supabase
        .from('tools_workspaces')
        .update({
          google_sync_token: eventsData.nextSyncToken,
          updated_at: new Date().toISOString(),
        })
        .eq('id', workspace.id);
    }

    console.log('Webhook sync complete');

  } catch (error) {
    console.error('Error processing webhook:', error);
  }

  // Always return 200 to acknowledge receipt
  return new Response('OK', { status: 200 });
});
