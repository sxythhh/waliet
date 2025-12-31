import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EvidenceRequest {
  payoutRequestId: string;
  creatorId: string;
  flags: Array<{
    type: string;
    reason: string;
  }>;
  deadline: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { payoutRequestId, creatorId, flags, deadline }: EvidenceRequest = await req.json();

    console.log('Sending evidence request', { payoutRequestId, creatorId, flagCount: flags.length });

    // Fetch creator info
    const { data: creator, error: creatorError } = await supabase
      .from('profiles')
      .select('email, full_name, username')
      .eq('id', creatorId)
      .single();

    if (creatorError || !creator) {
      console.error('Failed to fetch creator:', creatorError);
      return new Response(JSON.stringify({ error: 'Creator not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get email from auth.users
    const { data: authUser } = await supabase.auth.admin.getUserById(creatorId);
    const email = authUser?.user?.email || creator.email;

    if (!email) {
      console.error('No email found for creator');
      return new Response(JSON.stringify({ error: 'Creator email not found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch payout request details
    const { data: payoutRequest } = await supabase
      .from('submission_payout_requests')
      .select('total_amount')
      .eq('id', payoutRequestId)
      .single();

    const amount = payoutRequest?.total_amount || 0;
    const deadlineDate = new Date(deadline);
    const formattedDeadline = deadlineDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    });

    // Build flag list HTML
    const flagListHtml = flags
      .map(f => `<li style="color: #e5e5e5; margin-bottom: 8px;">${getFlagDescription(f.type)}</li>`)
      .join('');

    // Send email via Resend
    const uploadUrl = `https://virality.gg/dashboard?tab=payouts&evidence=${payoutRequestId}`;

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: 'Virality <no-reply@notifications.virality.gg>',
        to: [email],
        subject: 'Action Required: Verify Your Payout Request',
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif; background-color: #0a0a0a;">
              <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                <div style="background: linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 100%); border-radius: 16px; padding: 48px 32px; border: 1px solid #333;">
                  <div style="text-align: center; margin-bottom: 32px;">
                    <div style="display: inline-block; background: #FEF3C7; border-radius: 50%; padding: 16px; margin-bottom: 16px;">
                      <span style="font-size: 32px;">⚠️</span>
                    </div>
                    <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0 0 12px 0;">Verification Required</h1>
                    <p style="color: #a3a3a3; font-size: 16px; margin: 0;">Your payout request of <strong style="color: #10B981;">$${parseFloat(amount).toFixed(2)}</strong> requires additional verification</p>
                  </div>

                  <div style="background: #1a1a1a; border-radius: 12px; padding: 24px; margin-bottom: 24px; border: 1px solid #2a2a2a;">
                    <h3 style="color: #ffffff; font-size: 16px; margin: 0 0 16px 0;">Why we need verification:</h3>
                    <ul style="margin: 0; padding-left: 20px;">
                      ${flagListHtml}
                    </ul>
                  </div>

                  <div style="background: #1a1a1a; border-radius: 12px; padding: 24px; margin-bottom: 24px; border: 1px solid #2a2a2a;">
                    <h3 style="color: #ffffff; font-size: 16px; margin: 0 0 16px 0;">What we need from you:</h3>
                    <p style="color: #e5e5e5; font-size: 15px; margin: 0 0 16px 0;">Please upload a <strong>screen recording</strong> of your video analytics showing:</p>
                    <ul style="margin: 0 0 16px 0; padding-left: 20px;">
                      <li style="color: #a3a3a3; margin-bottom: 8px;">View source breakdown (e.g., "For You" page)</li>
                      <li style="color: #a3a3a3; margin-bottom: 8px;">Geographic distribution of viewers</li>
                      <li style="color: #a3a3a3; margin-bottom: 8px;">Watch time / average view duration</li>
                      <li style="color: #a3a3a3; margin-bottom: 8px;">Engagement metrics (likes, comments, shares)</li>
                    </ul>
                  </div>

                  <div style="background: #FEF3C7; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
                    <p style="color: #92400E; font-size: 14px; font-weight: 600; margin: 0;">
                      ⏰ Deadline: ${formattedDeadline}
                    </p>
                    <p style="color: #92400E; font-size: 13px; margin: 8px 0 0 0;">
                      If we don't receive your evidence by this deadline, your payout request will be automatically rejected.
                    </p>
                  </div>

                  <div style="text-align: center; margin-bottom: 24px;">
                    <a href="${uploadUrl}"
                       style="display: inline-block; background: linear-gradient(135deg, #9b87f5 0%, #7e69ab 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px; letter-spacing: -0.5px;">
                      Upload Evidence
                    </a>
                  </div>

                  <div style="border-top: 1px solid #2a2a2a; padding-top: 24px;">
                    <p style="color: #737373; font-size: 13px; margin: 0;">
                      This is a routine verification to ensure fair payouts for all creators. If you believe this is an error, please reach out to our support team.
                    </p>
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

    const emailResult = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error('Resend API error:', emailResult);
      throw new Error(emailResult.message || 'Failed to send email');
    }

    console.log('Evidence request email sent successfully', { emailId: emailResult.id });

    return new Response(JSON.stringify({
      success: true,
      message: 'Evidence request sent',
      emailId: emailResult.id,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error sending evidence request:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function getFlagDescription(flagType: string): string {
  switch (flagType) {
    case 'engagement':
      return 'Your video engagement rate appears lower than expected for the view count';
    case 'velocity':
      return 'We detected an unusual spike in your video views';
    case 'new_creator':
      return 'As a new creator with a larger payout, we need to verify your metrics';
    case 'previous_fraud':
      return 'Your account has been flagged for additional review based on previous activity';
    default:
      return 'Additional verification is required for this payout';
  }
}
