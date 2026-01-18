// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotifyPayoutReleaseRequest {
  user_id: string;
  amount_cents: number;
  boost_id?: string;
  boost_name?: string;
  payment_count?: number;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const body: NotifyPayoutReleaseRequest = await req.json();
    const { user_id, amount_cents, boost_id, boost_name, payment_count = 1 } = body;

    if (!user_id || !amount_cents) {
      return new Response(
        JSON.stringify({ error: "user_id and amount_cents are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get user profile and email
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("full_name, username")
      .eq("id", user_id)
      .single();

    if (profileError) {
      console.error("Error fetching profile:", profileError);
      return new Response(
        JSON.stringify({ error: "User not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get user email from auth
    const { data: authData, error: authError } = await supabase.auth.admin.getUserById(user_id);

    if (authError || !authData?.user?.email) {
      console.error("Error fetching user email:", authError);
      return new Response(
        JSON.stringify({ error: "User email not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const userEmail = authData.user.email;
    const userName = profile?.full_name || profile?.username || "Creator";
    const amountFormatted = (amount_cents / 100).toFixed(2);

    // Get boost name if not provided
    let campaignName = boost_name;
    if (!campaignName && boost_id) {
      const { data: boost } = await supabase
        .from("bounty_campaigns")
        .select("title")
        .eq("id", boost_id)
        .single();
      campaignName = boost?.title;
    }

    // Send email if Resend is configured
    if (resendApiKey) {
      const resend = new Resend(resendApiKey);

      const emailHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Your earnings are ready!</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <!-- Header -->
              <div style="background-color: #10b981; padding: 32px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">
                  Your earnings are ready!
                </h1>
              </div>

              <!-- Content -->
              <div style="padding: 32px;">
                <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                  Hey ${userName},
                </p>

                <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                  Great news! Your held earnings have been released and are now ready for withdrawal.
                </p>

                <!-- Amount Card -->
                <div style="background-color: #f0fdf4; border-radius: 8px; padding: 24px; text-align: center; margin: 24px 0;">
                  <p style="color: #059669; font-size: 14px; margin: 0 0 8px; font-weight: 500;">AMOUNT RELEASED</p>
                  <p style="color: #047857; font-size: 36px; font-weight: 700; margin: 0;">$${amountFormatted}</p>
                  ${payment_count > 1 ? `<p style="color: #6b7280; font-size: 14px; margin: 8px 0 0;">From ${payment_count} video${payment_count !== 1 ? 's' : ''}</p>` : ''}
                  ${campaignName ? `<p style="color: #6b7280; font-size: 14px; margin: 8px 0 0;">Campaign: ${campaignName}</p>` : ''}
                </div>

                <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                  Head to your wallet to request a payout. Remember, the minimum withdrawal amount is $1.00.
                </p>

                <!-- CTA Button -->
                <div style="text-align: center; margin: 32px 0;">
                  <a href="https://app.usevirality.com/dashboard?tab=wallet" style="display: inline-block; background-color: #10b981; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                    Go to Wallet
                  </a>
                </div>

                <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 24px 0 0;">
                  Keep creating great content!<br>
                  The Virality Team
                </p>
              </div>

              <!-- Footer -->
              <div style="background-color: #f9fafb; padding: 20px 32px; text-align: center; border-top: 1px solid #e5e7eb;">
                <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                  You're receiving this email because you have earnings on Virality.
                </p>
              </div>
            </div>
          </body>
        </html>
      `;

      try {
        const { data: emailResult, error: emailError } = await resend.emails.send({
          from: "Virality <notifications@usevirality.com>",
          to: [userEmail],
          subject: `$${amountFormatted} is ready to withdraw!`,
          html: emailHtml,
        });

        if (emailError) {
          console.error("Error sending email via Resend:", emailError);
        } else {
          console.log("Email sent successfully:", emailResult);
        }
      } catch (emailError) {
        console.error("Exception sending email:", emailError);
      }
    } else {
      console.log("Resend API key not configured, skipping email");
    }

    // Also send Discord DM if user has Discord linked
    try {
      const { data: discordAccount } = await supabase
        .from("social_accounts")
        .select("platform_user_id")
        .eq("user_id", user_id)
        .eq("platform", "discord")
        .single();

      if (discordAccount?.platform_user_id) {
        await supabase.functions.invoke("send-discord-dm", {
          body: {
            discord_user_id: discordAccount.platform_user_id,
            message: `Hey ${userName}! Your held earnings of **$${amountFormatted}** have been released and are now ready for withdrawal. Head to your wallet to request a payout!`,
          },
        });
      }
    } catch (discordError) {
      console.error("Error sending Discord DM:", discordError);
      // Non-fatal, continue
    }

    return new Response(
      JSON.stringify({
        success: true,
        email_sent_to: userEmail,
        amount: amountFormatted,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in notify-payout-release:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
