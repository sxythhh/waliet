import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const DISCORD_BOT_TOKEN = Deno.env.get("DISCORD_BOT_TOKEN");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PaymentNotificationRequest {
  userId: string;
  userEmail: string;
  userName: string;
  amount: number;
  campaignName: string;
  accountUsername: string;
  platform: string;
  views: number;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      userId,
      userEmail, 
      userName, 
      amount, 
      campaignName, 
      accountUsername, 
      platform,
      views 
    }: PaymentNotificationRequest = await req.json();

    console.log("Sending payment notification to:", userEmail);

    // Send Discord DM if user has Discord linked
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const { data: profile } = await supabase
      .from('profiles')
      .select('discord_id')
      .eq('id', userId)
      .single();

    if (profile?.discord_id && DISCORD_BOT_TOKEN) {
      try {
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
          
          // Send message
          await fetch(`https://discord.com/api/v10/channels/${dmChannel.id}/messages`, {
            method: 'POST',
            headers: {
              'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              content: "💰 **Payment Received!**",
              embeds: [{
                title: "Payment Notification",
                description: `You've received a payment for your campaign performance!`,
                color: 0x10b981, // Green
                fields: [
                  {
                    name: "Amount",
                    value: `$${amount.toFixed(2)}`,
                    inline: true
                  },
                  {
                    name: "Campaign",
                    value: campaignName,
                    inline: true
                  },
                  {
                    name: "Account",
                    value: `@${accountUsername} (${platform})`,
                    inline: false
                  },
                  {
                    name: "Views Paid",
                    value: views.toLocaleString(),
                    inline: true
                  }
                ],
                footer: {
                  text: "Virality - Check your dashboard for details"
                },
                timestamp: new Date().toISOString()
              }]
            }),
          });
          console.log("Discord DM sent successfully");
        }
      } catch (discordError) {
        console.error("Discord DM failed (non-critical):", discordError);
        // Continue with email notification even if Discord fails
      }
    }

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Virality <payments@notifications.virality.gg>",
        to: [userEmail],
        subject: `Payment Received: $${amount.toFixed(2)} for ${campaignName}`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
                .amount { font-size: 36px; font-weight: bold; color: #10b981; margin: 20px 0; }
                .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
                .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
                .detail-label { font-weight: 600; color: #6b7280; }
                .detail-value { color: #111827; }
                .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>🎉 Payment Received!</h1>
                </div>
                <div class="content">
                  <p>Hi ${userName},</p>
                  <p>Great news! You've received a payment for your campaign performance.</p>
                  
                  <div class="amount">$${amount.toFixed(2)}</div>
                  
                  <div class="details">
                    <div class="detail-row">
                      <span class="detail-label">Campaign:</span>
                      <span class="detail-value">${campaignName}</span>
                    </div>
                    <div class="detail-row">
                      <span class="detail-label">Account:</span>
                      <span class="detail-value">@${accountUsername}</span>
                    </div>
                    <div class="detail-row">
                      <span class="detail-label">Platform:</span>
                      <span class="detail-value">${platform.charAt(0).toUpperCase() + platform.slice(1)}</span>
                    </div>
                    <div class="detail-row">
                      <span class="detail-label">Views Paid:</span>
                      <span class="detail-value">${views.toLocaleString()}</span>
                    </div>
                  </div>

                  <p>The payment has been added to your wallet balance and is ready for withdrawal.</p>
                  
                  <p>Keep up the great work!</p>
                  
                  <p>Best regards,<br>The Virality Team</p>
                </div>
                <div class="footer">
                  <p>This is an automated notification. Please do not reply to this email.</p>
                </div>
              </div>
            </body>
          </html>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.text();
      console.error("Resend API error:", errorData);
      throw new Error(`Failed to send email: ${errorData}`);
    }

    const emailData = await emailResponse.json();
    console.log("Email sent successfully:", emailData);

    return new Response(JSON.stringify(emailData), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending payment notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
