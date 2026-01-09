import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { getCorsHeaders, handleCorsOptions } from '../_shared/cors.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const BATCH_SIZE = 50; // Resend allows up to 100, using 50 for safety

interface BroadcastPayload {
  broadcast_id: string;
}

interface Recipient {
  id: string;
  email: string;
  full_name: string | null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCorsOptions(req);
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY not configured');
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Verify admin authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin
    const { data: adminRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!adminRole) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload: BroadcastPayload = await req.json();
    const { broadcast_id } = payload;

    if (!broadcast_id) {
      return new Response(
        JSON.stringify({ error: 'broadcast_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch the broadcast
    const { data: broadcast, error: broadcastError } = await supabase
      .from('email_broadcasts')
      .select('*')
      .eq('id', broadcast_id)
      .single();

    if (broadcastError || !broadcast) {
      return new Response(
        JSON.stringify({ error: 'Broadcast not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (broadcast.status === 'sending') {
      return new Response(
        JSON.stringify({ error: 'Broadcast is already being sent' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (broadcast.status === 'sent') {
      return new Response(
        JSON.stringify({ error: 'Broadcast has already been sent' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update broadcast status to 'sending'
    await supabase
      .from('email_broadcasts')
      .update({ status: 'sending' })
      .eq('id', broadcast_id);

    // Build recipient query based on segment
    let recipientQuery = supabase
      .from('profiles')
      .select('id, email, full_name')
      .not('email', 'is', null);

    const segment = broadcast.segment || 'all';
    const segmentFilter = broadcast.segment_filter || {};

    if (segment === 'creators') {
      // Users who have social accounts
      const { data: creatorIds } = await supabase
        .from('social_accounts')
        .select('user_id')
        .not('user_id', 'is', null);

      if (creatorIds && creatorIds.length > 0) {
        const uniqueIds = [...new Set(creatorIds.map(c => c.user_id))];
        recipientQuery = recipientQuery.in('id', uniqueIds);
      }
    } else if (segment === 'brands') {
      // Users who have brand roles
      const { data: brandUserIds } = await supabase
        .from('brand_users')
        .select('user_id')
        .not('user_id', 'is', null);

      if (brandUserIds && brandUserIds.length > 0) {
        const uniqueIds = [...new Set(brandUserIds.map(b => b.user_id))];
        recipientQuery = recipientQuery.in('id', uniqueIds);
      }
    } else if (segment === 'custom' && segmentFilter.user_ids) {
      recipientQuery = recipientQuery.in('id', segmentFilter.user_ids);
    }

    // Apply subscribed_to_updates filter if not a custom segment
    if (segment !== 'custom') {
      recipientQuery = recipientQuery.eq('subscribed_to_updates', true);
    }

    const { data: recipients, error: recipientsError } = await recipientQuery;

    if (recipientsError) {
      console.error('Error fetching recipients:', recipientsError);
      await supabase
        .from('email_broadcasts')
        .update({ status: 'failed' })
        .eq('id', broadcast_id);

      return new Response(
        JSON.stringify({ error: 'Failed to fetch recipients' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!recipients || recipients.length === 0) {
      await supabase
        .from('email_broadcasts')
        .update({
          status: 'sent',
          recipient_count: 0,
          sent_count: 0,
          sent_at: new Date().toISOString()
        })
        .eq('id', broadcast_id);

      return new Response(
        JSON.stringify({ success: true, sent_count: 0, message: 'No recipients found' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update recipient count
    await supabase
      .from('email_broadcasts')
      .update({ recipient_count: recipients.length })
      .eq('id', broadcast_id);

    let sentCount = 0;
    let failedCount = 0;

    // Send emails in batches
    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE);

      // Send individual emails (Resend batch API requires same content for all)
      for (const recipient of batch) {
        try {
          // Personalize content with recipient name
          const personalizedContent = broadcast.html_content
            .replace(/\{\{name\}\}/g, recipient.full_name || 'there')
            .replace(/\{\{email\}\}/g, recipient.email);

          const emailResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
              from: 'Virality <announcements@notifications.virality.gg>',
              to: [recipient.email],
              subject: broadcast.subject,
              html: personalizedContent,
            }),
          });

          const emailResult = await emailResponse.json();

          if (emailResponse.ok) {
            sentCount++;

            // Log successful send
            await supabase
              .from('email_logs')
              .insert({
                resend_id: emailResult.id,
                broadcast_id: broadcast_id,
                recipient_email: recipient.email,
                recipient_id: recipient.id,
                subject: broadcast.subject,
                status: 'sent',
              });
          } else {
            failedCount++;
            console.error(`Failed to send to ${recipient.email}:`, emailResult);

            // Log failed send
            await supabase
              .from('email_logs')
              .insert({
                broadcast_id: broadcast_id,
                recipient_email: recipient.email,
                recipient_id: recipient.id,
                subject: broadcast.subject,
                status: 'failed',
                error_message: emailResult.message || 'Unknown error',
              });
          }
        } catch (error) {
          failedCount++;
          console.error(`Error sending to ${recipient.email}:`, error);
        }
      }

      // Update progress
      await supabase
        .from('email_broadcasts')
        .update({
          sent_count: sentCount,
          failed_count: failedCount
        })
        .eq('id', broadcast_id);
    }

    // Finalize broadcast status
    const finalStatus = failedCount === 0 ? 'sent' :
                        sentCount === 0 ? 'failed' : 'partial';

    await supabase
      .from('email_broadcasts')
      .update({
        status: finalStatus,
        sent_count: sentCount,
        failed_count: failedCount,
        sent_at: new Date().toISOString()
      })
      .eq('id', broadcast_id);

    console.log(`Broadcast ${broadcast_id} completed: ${sentCount} sent, ${failedCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        sent_count: sentCount,
        failed_count: failedCount,
        status: finalStatus
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-broadcast-email:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
