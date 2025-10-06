import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ApplicationApprovalRequest {
  submissionId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { submissionId }: ApplicationApprovalRequest = await req.json();

    console.log("Processing application approval email for submission:", submissionId);

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Get submission details with campaign and user info
    const { data: submission, error: submissionError } = await supabase
      .from("campaign_submissions")
      .select(`
        *,
        campaigns:campaign_id (
          title,
          brand_name,
          brand_logo_url,
          banner_url,
          slug,
          guidelines,
          allowed_platforms
        ),
        profiles:creator_id (
          email,
          full_name,
          username
        )
      `)
      .eq("id", submissionId)
      .single();

    if (submissionError || !submission) {
      throw new Error("Submission not found");
    }

    const campaign = submission.campaigns as any;
    const profile = submission.profiles as any;

    if (!profile?.email) {
      throw new Error("User email not found");
    }

    const campaignUrl = `https://virality.gg/campaign/${campaign.slug}`;

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Virality <campaigns@notifications.virality.gg>",
        to: [profile.email],
        subject: `Your application for "${campaign.title}" has been approved! 🎉`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb;">
            ${campaign.banner_url ? `
              <div style="width: 100%; height: 200px; overflow: hidden; border-radius: 8px 8px 0 0;">
                <img src="${campaign.banner_url}" alt="${campaign.title}" style="width: 100%; height: 100%; object-fit: cover;" />
              </div>
            ` : ''}
            
            <div style="padding: 30px; background-color: white; border-radius: 0 0 8px 8px;">
              ${campaign.brand_logo_url ? `
                <div style="text-align: center; margin-bottom: 20px;">
                  <img src="${campaign.brand_logo_url}" alt="${campaign.brand_name}" style="width: 80px; height: 80px; object-fit: contain; border-radius: 8px;" />
                </div>
              ` : ''}
              
              <h1 style="color: #8B5CF6; text-align: center; margin-bottom: 10px;">Congratulations!</h1>
              <p style="text-align: center; color: #666; font-size: 16px;">Hi ${profile.full_name || profile.username},</p>
              <p style="color: #333; font-size: 16px; line-height: 1.6;">Great news! Your application for the <strong>${campaign.title}</strong> campaign by <strong>${campaign.brand_name}</strong> has been approved.</p>
              
              <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h2 style="color: #333; margin-top: 0; font-size: 18px;">Next Steps</h2>
                <ol style="color: #666; line-height: 1.8; margin: 0; padding-left: 20px;">
                  <li>Review the campaign guidelines carefully</li>
                  <li>Create your content following the brand's requirements</li>
                  <li>Link your social account to start tracking your performance</li>
                  <li>Your earnings will be tracked automatically based on views</li>
                </ol>
              </div>

              ${campaign.guidelines ? `
                <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
                  <h3 style="color: #92400e; margin-top: 0; font-size: 16px;">Campaign Guidelines</h3>
                  <p style="color: #78350f; white-space: pre-wrap; margin: 0; font-size: 14px;">${campaign.guidelines}</p>
                </div>
              ` : ''}

              <div style="text-align: center; margin: 30px 0;">
                <a href="${campaignUrl}" 
                   style="background-color: #8B5CF6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px;">
                  View Campaign Details
                </a>
              </div>

              <p style="color: #666; font-size: 14px; margin-top: 30px; text-align: center;">
                If you have any questions, feel free to reach out to the brand team or check the campaign page for more details.
              </p>

              <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
              <p style="color: #999; font-size: 12px; text-align: center;">
                Virality - Creator Marketing Platform
              </p>
            </div>
          </div>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.json();
      throw new Error(errorData.message || "Failed to send email");
    }

    const emailData = await emailResponse.json();
    console.log("Approval email sent successfully:", emailData);

    return new Response(JSON.stringify(emailData), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending approval email:", error);
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
