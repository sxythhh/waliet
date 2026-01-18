import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DepositNotificationRequest {
  brandId: string;
  amount: number;
  source: "card" | "wire" | "crypto" | "coinbase";
  transactionId?: string;
}

const sourceLabels: Record<string, string> = {
  card: "Card Payment",
  wire: "Wire Transfer",
  crypto: "Crypto Deposit",
  coinbase: "Coinbase Purchase",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { brandId, amount, source, transactionId }: DepositNotificationRequest = await req.json();

    console.log("Processing deposit notification:", { brandId, amount, source });

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Get brand details
    const { data: brand, error: brandError } = await supabase
      .from("brands")
      .select("id, name, logo_url")
      .eq("id", brandId)
      .single();

    if (brandError || !brand) {
      console.error("Brand not found:", brandError);
      return new Response(JSON.stringify({ error: "Brand not found" }), {
        status: 404,
        headers: corsHeaders,
      });
    }

    // Get brand admins and owners
    const { data: members, error: membersError } = await supabase
      .from("brand_members")
      .select(`
        user_id,
        role,
        profiles:user_id (
          id,
          email,
          full_name,
          username
        )
      `)
      .eq("brand_id", brandId)
      .in("role", ["owner", "admin"]);

    if (membersError || !members || members.length === 0) {
      console.log("No admin members found for brand:", brandId);
      return new Response(JSON.stringify({ message: "No admins to notify" }), {
        status: 200,
        headers: corsHeaders,
      });
    }

    const sourceLabel = sourceLabels[source] || source;
    const emailPromises = [];

    for (const member of members) {
      const profile = member.profiles as any;
      if (!profile?.email) continue;

      const emailPromise = fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "Virality <deposits@notifications.virality.gg>",
          to: [profile.email],
          subject: `Deposit Received: $${amount.toFixed(2)} for ${brand.name}`,
          html: `
            <!DOCTYPE html>
            <html>
              <head>
                <style>
                  body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                  .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                  .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
                  .amount { font-size: 36px; font-weight: bold; color: #10b981; margin: 20px 0; text-align: center; }
                  .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
                  .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
                  .detail-row:last-child { border-bottom: none; }
                  .detail-label { font-weight: 600; color: #6b7280; }
                  .detail-value { color: #111827; }
                  .cta { text-align: center; margin: 30px 0; }
                  .cta a { background: #10b981; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; }
                  .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1>Deposit Received</h1>
                  </div>
                  <div class="content">
                    <p>Hi ${profile.full_name || profile.username || "there"},</p>
                    <p>Great news! A deposit has been successfully added to your <strong>${brand.name}</strong> wallet.</p>

                    <div class="amount">$${amount.toFixed(2)}</div>

                    <div class="details">
                      <div class="detail-row">
                        <span class="detail-label">Workspace:</span>
                        <span class="detail-value">${brand.name}</span>
                      </div>
                      <div class="detail-row">
                        <span class="detail-label">Payment Method:</span>
                        <span class="detail-value">${sourceLabel}</span>
                      </div>
                      <div class="detail-row">
                        <span class="detail-label">Status:</span>
                        <span class="detail-value" style="color: #10b981;">Confirmed</span>
                      </div>
                      ${transactionId ? `
                      <div class="detail-row">
                        <span class="detail-label">Reference:</span>
                        <span class="detail-value" style="font-family: monospace; font-size: 12px;">${transactionId.slice(0, 16)}...</span>
                      </div>
                      ` : ""}
                    </div>

                    <p>Your wallet balance has been updated and funds are ready to use for campaigns and boosts.</p>

                    <div class="cta">
                      <a href="https://app.virality.gg/brand">View Wallet</a>
                    </div>

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

      emailPromises.push(emailPromise);
    }

    // Send all emails in parallel
    const results = await Promise.allSettled(emailPromises);
    const successCount = results.filter((r) => r.status === "fulfilled").length;
    const failCount = results.filter((r) => r.status === "rejected").length;

    console.log(`Deposit notifications sent: ${successCount} success, ${failCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        emailsSent: successCount,
        emailsFailed: failCount,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error sending deposit notification:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
