import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PaymentNotificationRequest {
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
      userEmail, 
      userName, 
      amount, 
      campaignName, 
      accountUsername, 
      platform,
      views 
    }: PaymentNotificationRequest = await req.json();

    console.log("Sending payment notification to:", userEmail);

    const emailResponse = await resend.emails.send({
      from: "Virality <onboarding@resend.dev>",
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
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
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
