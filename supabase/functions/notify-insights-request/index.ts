import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { requestId, brandName, brandLogoUrl, creatorId, message } = await req.json();

    if (!requestId || !brandName || !creatorId) {
      throw new Error('Missing required fields: requestId, brandName, creatorId');
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch creator's profile
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('id, username, email, discord_id, discord_username')
      .eq('id', creatorId)
      .single();

    if (profileError) {
      throw new Error(`Failed to fetch creator profile: ${profileError.message}`);
    }

    const results = {
      discord: { sent: false, error: null as string | null },
      email: { sent: false, error: null as string | null },
    };

    // Send Discord DM if user has linked Discord
    if (profile?.discord_id) {
      try {
        const DISCORD_BOT_TOKEN = Deno.env.get('DISCORD_BOT_TOKEN');
        if (DISCORD_BOT_TOKEN) {
          // Create DM channel
          const dmChannelResponse = await fetch('https://discord.com/api/v10/users/@me/channels', {
            method: 'POST',
            headers: {
              'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              recipient_id: profile.discord_id,
            }),
          });

          if (dmChannelResponse.ok) {
            const dmChannel = await dmChannelResponse.json();

            // Send message with embed
            const messagePayload = {
              embeds: [{
                title: "Audience Insights Request",
                description: `**${brandName}** has requested your audience insights.${message ? `\n\n"${message}"` : ''}`,
                color: 0x2563EB, // Blue
                fields: [
                  {
                    name: "What to do",
                    value: "Head to your Virality dashboard to share your audience insights.",
                    inline: false
                  }
                ],
                footer: {
                  text: "This request expires in 7 days"
                },
                timestamp: new Date().toISOString(),
              }],
            };

            const sendMessageResponse = await fetch(
              `https://discord.com/api/v10/channels/${dmChannel.id}/messages`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(messagePayload),
              }
            );

            if (sendMessageResponse.ok) {
              results.discord.sent = true;
              console.log(`Discord DM sent to ${profile.discord_username}`);
            } else {
              results.discord.error = `Failed to send message: ${sendMessageResponse.status}`;
            }
          } else {
            results.discord.error = `Failed to create DM channel: ${dmChannelResponse.status}`;
          }
        }
      } catch (discordError: any) {
        results.discord.error = discordError.message;
        console.error('Discord DM error:', discordError);
      }
    }

    // Send email notification if user has email
    if (profile?.email) {
      try {
        const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
        if (RESEND_API_KEY) {
          const emailResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${RESEND_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'Virality <noreply@virality.so>',
              to: [profile.email],
              subject: `${brandName} wants to see your audience insights`,
              html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <h2 style="color: #1f2937; margin-bottom: 16px;">Audience Insights Request</h2>

                  <p style="color: #4b5563; margin-bottom: 16px;">
                    <strong>${brandName}</strong> has requested to see your audience insights on Virality.
                  </p>

                  ${message ? `
                    <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
                      <p style="color: #6b7280; font-style: italic; margin: 0;">"${message}"</p>
                    </div>
                  ` : ''}

                  <p style="color: #4b5563; margin-bottom: 24px;">
                    Sharing your audience insights helps brands understand your reach and can lead to more collaboration opportunities.
                  </p>

                  <a href="https://virality.so/dashboard?tab=profile"
                     style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 500;">
                    Share Your Insights
                  </a>

                  <p style="color: #9ca3af; font-size: 14px; margin-top: 24px;">
                    This request expires in 7 days.
                  </p>
                </div>
              `,
            }),
          });

          if (emailResponse.ok) {
            results.email.sent = true;
            console.log(`Email sent to ${profile.email}`);
          } else {
            const errorData = await emailResponse.text();
            results.email.error = `Failed to send email: ${errorData}`;
          }
        }
      } catch (emailError: any) {
        results.email.error = emailError.message;
        console.error('Email error:', emailError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Error in notify-insights-request:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        success: false,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
