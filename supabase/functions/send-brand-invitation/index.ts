import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface BrandInvitationRequest {
  email: string;
  brandName: string;
  brandSlug: string;
  role: string;
  inviterName: string;
  invitationId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, brandName, brandSlug, role, inviterName, invitationId }: BrandInvitationRequest = await req.json();

    console.log("Sending brand invitation email to:", email);

    const inviteUrl = `https://app.virality.gg/brand/${brandSlug}/invite/${invitationId}`;

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Virality <invitations@notifications.virality.gg>",
        to: [email],
        subject: `You've been invited to join ${brandName} on Virality`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <img src="https://app.virality.gg/lovable-uploads/38b60a02-7cb6-4adb-b1b9-62f4de7373fd.webp" alt="Virality" style="height: 32px; margin-bottom: 20px;" />
            </div>
            <h1 style="color: #333; text-align: center; font-size: 24px; margin-bottom: 24px;">Brand Team Invitation</h1>
            <p style="color: #333; font-size: 16px; line-height: 1.6;">Hi there,</p>
            <p style="color: #333; font-size: 16px; line-height: 1.6;"><strong>${inviterName}</strong> has invited you to join <strong>${brandName}</strong> as a <strong>${role}</strong>.</p>
            <p style="color: #333; font-size: 16px; line-height: 1.6;">Click the button below to view the brand and accept your invitation:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${inviteUrl}" 
                 style="background-color: #2061e0; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500; font-size: 16px;">
                View Brand
              </a>
            </div>
            <p style="color: #666; font-size: 14px; text-align: center;">
              If you didn't expect this invitation, you can safely ignore this email.
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0 20px 0;">
            <p style="color: #999; font-size: 12px; text-align: center;">Virality - Creator Marketing Platform</p>
          </div>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.json();
      throw new Error(errorData.message || "Failed to send email");
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
    console.error("Error sending invitation email:", error);
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
