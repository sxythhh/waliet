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

    const inviteUrl = `https://virality.gg/brand/${brandSlug}/invite/${invitationId}`;

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
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333;">Brand Team Invitation</h1>
            <p>Hi there,</p>
            <p><strong>${inviterName}</strong> has invited you to join <strong>${brandName}</strong> as a <strong>${role}</strong>.</p>
            <p>Click the button below to view the brand and accept your invitation:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${inviteUrl}" 
                 style="background-color: #8B5CF6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                View Brand
              </a>
            </div>
            <p style="color: #666; font-size: 14px;">
              If you didn't expect this invitation, you can safely ignore this email.
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #999; font-size: 12px;">Virality - Creator Marketing Platform</p>
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
