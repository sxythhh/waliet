import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Process evidence deadlines - runs hourly via cron
 * Auto-rejects payout requests that have exceeded their evidence deadline
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Processing evidence deadlines...');

    // Find all payout requests that:
    // 1. Are pending evidence
    // 2. Have exceeded their deadline
    // 3. Have no evidence uploaded
    const now = new Date().toISOString();

    const { data: expiredRequests, error: fetchError } = await supabase
      .from('submission_payout_requests')
      .select(`
        id,
        user_id,
        total_amount,
        evidence_deadline,
        profiles:user_id (
          id,
          username,
          email
        )
      `)
      .eq('auto_approval_status', 'pending_evidence')
      .lt('evidence_deadline', now);

    if (fetchError) {
      console.error('Failed to fetch expired requests:', fetchError);
      throw fetchError;
    }

    if (!expiredRequests || expiredRequests.length === 0) {
      console.log('No expired evidence requests found');
      return new Response(JSON.stringify({
        success: true,
        processed: 0,
        message: 'No expired requests',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${expiredRequests.length} expired requests to process`);

    const results = {
      processed: 0,
      rejected: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (const request of expiredRequests) {
      try {
        // Check if evidence was uploaded (even if late)
        const { data: evidence } = await supabase
          .from('fraud_evidence')
          .select('id')
          .eq('payout_request_id', request.id)
          .limit(1);

        if (evidence && evidence.length > 0) {
          // Evidence exists, move to pending_review instead of auto-reject
          await supabase
            .from('submission_payout_requests')
            .update({
              auto_approval_status: 'pending_review',
            })
            .eq('id', request.id);

          results.skipped++;
          console.log(`Request ${request.id} has evidence, moved to pending_review`);
          continue;
        }

        // No evidence - auto-reject
        await supabase
          .from('submission_payout_requests')
          .update({
            status: 'cancelled',
            auto_approval_status: 'failed',
            rejection_reason: 'Evidence not provided within deadline',
          })
          .eq('id', request.id);

        // Unlock the ledger entries back to pending
        await supabase
          .from('payment_ledger')
          .update({
            status: 'pending',
            payout_request_id: null,
            locked_at: null,
            clearing_ends_at: null,
          })
          .eq('payout_request_id', request.id);

        // Update fraud flags to dismissed (no evidence provided)
        await supabase
          .from('fraud_flags')
          .update({
            status: 'dismissed',
            resolution_notes: 'Payout auto-rejected due to no evidence provided',
            resolved_at: now,
          })
          .eq('payout_request_id', request.id)
          .eq('status', 'pending');

        results.rejected++;
        console.log(`Request ${request.id} auto-rejected - no evidence`);

        // Send notification to creator
        try {
          await sendRejectionEmail(supabase, request);
        } catch (e) {
          console.error('Failed to send rejection email:', e);
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.errors.push(`Request ${request.id}: ${errorMessage}`);
        console.error(`Error processing request ${request.id}:`, error);
      }

      results.processed++;
    }

    console.log('Deadline processing complete', results);

    return new Response(JSON.stringify({
      success: true,
      ...results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error processing evidence deadlines:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function sendRejectionEmail(supabase: any, request: any) {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  if (!resendApiKey) return;

  const creator = request.profiles as any;

  // Get email from auth
  const { data: authUser } = await supabase.auth.admin.getUserById(request.user_id);
  const email = authUser?.user?.email || creator?.email;

  if (!email) return;

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${resendApiKey}`,
    },
    body: JSON.stringify({
      from: 'Virality <no-reply@notifications.virality.gg>',
      to: [email],
      subject: 'Payout Request Rejected - Evidence Not Provided',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; background-color: #0a0a0a;">
            <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
              <div style="background: linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 100%); border-radius: 16px; padding: 48px 32px; border: 1px solid #333;">
                <div style="text-align: center; margin-bottom: 32px;">
                  <h1 style="color: #ffffff; font-size: 24px; font-weight: 700; margin: 0 0 12px 0;">Payout Request Rejected</h1>
                  <p style="color: #EF4444; font-size: 16px; margin: 0;">Evidence not provided within deadline</p>
                </div>

                <div style="background: #1a1a1a; border-radius: 12px; padding: 24px; margin-bottom: 24px; border: 1px solid #2a2a2a;">
                  <p style="color: #e5e5e5; font-size: 15px; margin: 0 0 16px 0;">
                    Your payout request for <strong>$${parseFloat(request.total_amount).toFixed(2)}</strong> has been rejected because we did not receive the requested verification evidence within 48 hours.
                  </p>
                  <p style="color: #a3a3a3; font-size: 14px; margin: 0;">
                    Your earnings have been returned to your pending balance. You can submit a new payout request at any time.
                  </p>
                </div>

                <div style="text-align: center;">
                  <a href="https://virality.gg/dashboard?tab=payouts"
                     style="display: inline-block; background: linear-gradient(135deg, #9b87f5 0%, #7e69ab 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px;">
                    View Payouts
                  </a>
                </div>

                <div style="text-align: center; margin-top: 32px; padding-top: 24px; border-top: 1px solid #2a2a2a;">
                  <p style="color: #525252; font-size: 12px; margin: 0;">© 2025 Virality. All rights reserved.</p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `,
    }),
  });
}
