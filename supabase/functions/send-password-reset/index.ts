import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PasswordResetRequest {
  email: string;
  redirectTo: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const { email, redirectTo }: PasswordResetRequest = await req.json();
    
    console.log("Password reset requested for:", email);

    // Create admin client to generate reset link
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Generate password reset link - redirect to virality.gg
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: 'https://virality.gg/reset-password'
      }
    });

    if (error) {
      console.error("Error generating reset link:", error);
      throw error;
    }

    console.log("Reset link generated successfully");

    // Send email via Resend with custom template
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "Virality <no-reply@notifications.virality.gg>",
        to: [email],
        subject: "Reset Your Virality Password",
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
                    <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0 0 12px 0;">Reset Your Password</h1>
                    <p style="color: #a3a3a3; font-size: 16px; margin: 0;">We received a request to reset your Virality account password</p>
                  </div>
                  
                  <div style="background: #1a1a1a; border-radius: 12px; padding: 24px; margin-bottom: 32px; border: 1px solid #2a2a2a;">
                    <p style="color: #e5e5e5; font-size: 15px; margin: 0 0 20px 0;">Click the button below to reset your password. This link will expire in 1 hour.</p>
                    <div style="text-align: center;">
                      <a href="${data.properties.action_link}" 
                         style="display: inline-block; background: linear-gradient(135deg, #9b87f5 0%, #7e69ab 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px; letter-spacing: -0.5px;">
                        Reset Password
                      </a>
                    </div>
                  </div>

                  <div style="border-top: 1px solid #2a2a2a; padding-top: 24px;">
                    <p style="color: #737373; font-size: 13px; margin: 0 0 8px 0;">If the button doesn't work, copy and paste this link into your browser:</p>
                    <p style="color: #9b87f5; font-size: 12px; word-break: break-all; margin: 0 0 16px 0;">${data.properties.action_link}</p>
                    <p style="color: #737373; font-size: 13px; margin: 0;">If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
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
      console.error("Resend API error:", emailResult);
      throw new Error(emailResult.message || "Failed to send email");
    }

    console.log("Email sent successfully:", emailResult);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: "Password reset email sent successfully" 
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-password-reset function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json", 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);
