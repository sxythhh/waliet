import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const resendApiKey = Deno.env.get("RESEND_API_KEY")!;

interface EmailPayload {
  user: {
    id: string;
    email: string;
    user_metadata?: {
      full_name?: string;
    };
  };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type: string;
    site_url: string;
    token_new?: string;
    token_hash_new?: string;
  };
}

// Email template generator based on action type
function generateEmailHTML(payload: EmailPayload): { subject: string; html: string } {
  const { user, email_data } = payload;
  const { token, token_hash, email_action_type, redirect_to, site_url } = email_data;
  const userName = user.user_metadata?.full_name || "there";

  // Base URL for verification
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const verifyUrl = `${supabaseUrl}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${encodeURIComponent(redirect_to || site_url)}`;

  // Common styles
  const baseStyles = `
    <style>
      body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif; background-color: #0a0a0a; }
      .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
      .card { background: linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 100%); border-radius: 16px; padding: 48px 32px; border: 1px solid #333; }
      .header { text-align: center; margin-bottom: 32px; }
      .title { color: #ffffff; font-size: 28px; font-weight: 700; margin: 0 0 12px 0; letter-spacing: -0.5px; }
      .subtitle { color: #a3a3a3; font-size: 16px; margin: 0; }
      .content { background: #1a1a1a; border-radius: 12px; padding: 24px; margin-bottom: 32px; border: 1px solid #2a2a2a; }
      .text { color: #e5e5e5; font-size: 15px; margin: 0 0 20px 0; line-height: 1.6; }
      .otp-container { text-align: center; margin: 24px 0; }
      .otp-code { display: inline-block; background: linear-gradient(135deg, #9b87f5 0%, #7e69ab 100%); color: #ffffff; font-size: 32px; font-weight: 700; letter-spacing: 8px; padding: 16px 32px; border-radius: 12px; font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Mono', monospace; }
      .button-container { text-align: center; margin: 24px 0; }
      .button { display: inline-block; background: linear-gradient(135deg, #9b87f5 0%, #7e69ab 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px; letter-spacing: -0.5px; }
      .divider { border-top: 1px solid #2a2a2a; padding-top: 24px; }
      .small-text { color: #737373; font-size: 13px; margin: 0 0 8px 0; }
      .link { color: #9b87f5; font-size: 12px; word-break: break-all; margin: 0 0 16px 0; }
      .footer { text-align: center; margin-top: 32px; padding-top: 24px; border-top: 1px solid #2a2a2a; }
      .footer-text { color: #525252; font-size: 12px; margin: 0; }
      .logo { margin-bottom: 24px; }
    </style>
  `;

  // OTP/Magic Link email (most common for our use case)
  if (email_action_type === "magiclink" || email_action_type === "email") {
    return {
      subject: `Your Virality Login Code: ${token}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            ${baseStyles}
          </head>
          <body>
            <div class="container">
              <div class="card">
                <div class="header">
                  <div class="logo">
                    <img src="https://virality.gg/lovable-uploads/05566301-7c21-4e5b-9e22-a097cbaf1442.png" alt="Virality" height="40" style="height: 40px;" />
                  </div>
                  <h1 class="title">Sign In to Virality</h1>
                  <p class="subtitle">Enter this code to complete your sign in</p>
                </div>

                <div class="content">
                  <div class="otp-container">
                    <div class="otp-code">${token}</div>
                  </div>
                  <p style="color: #a3a3a3; font-size: 14px; text-align: center; margin: 16px 0 0 0;">
                    This code expires in 10 minutes
                  </p>
                </div>

                <div class="divider">
                  <p class="small-text">Or click the button below to sign in automatically:</p>
                  <div class="button-container">
                    <a href="${verifyUrl}" class="button">Sign In to Virality</a>
                  </div>
                </div>

                <div style="margin-top: 24px;">
                  <p class="small-text">If you didn't request this code, you can safely ignore this email.</p>
                </div>

                <div class="footer">
                  <p class="footer-text">&copy; 2026 Virality. All rights reserved.</p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `,
    };
  }

  // Signup confirmation
  if (email_action_type === "signup" || email_action_type === "email_signup") {
    return {
      subject: "Welcome to Virality - Confirm Your Email",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            ${baseStyles}
          </head>
          <body>
            <div class="container">
              <div class="card">
                <div class="header">
                  <div class="logo">
                    <img src="https://virality.gg/lovable-uploads/05566301-7c21-4e5b-9e22-a097cbaf1442.png" alt="Virality" height="40" style="height: 40px;" />
                  </div>
                  <h1 class="title">Welcome to Virality!</h1>
                  <p class="subtitle">Confirm your email to get started</p>
                </div>

                <div class="content">
                  <p class="text">Hey ${userName},</p>
                  <p class="text">Thanks for signing up! Enter this code to verify your email:</p>
                  <div class="otp-container">
                    <div class="otp-code">${token}</div>
                  </div>
                  <p style="color: #a3a3a3; font-size: 14px; text-align: center; margin: 16px 0 0 0;">
                    This code expires in 24 hours
                  </p>
                </div>

                <div class="divider">
                  <p class="small-text">Or click the button below:</p>
                  <div class="button-container">
                    <a href="${verifyUrl}" class="button">Confirm Email</a>
                  </div>
                </div>

                <div class="footer">
                  <p class="footer-text">&copy; 2026 Virality. All rights reserved.</p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `,
    };
  }

  // Password recovery
  if (email_action_type === "recovery") {
    return {
      subject: "Reset Your Virality Password",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            ${baseStyles}
          </head>
          <body>
            <div class="container">
              <div class="card">
                <div class="header">
                  <div class="logo">
                    <img src="https://virality.gg/lovable-uploads/05566301-7c21-4e5b-9e22-a097cbaf1442.png" alt="Virality" height="40" style="height: 40px;" />
                  </div>
                  <h1 class="title">Reset Your Password</h1>
                  <p class="subtitle">We received a request to reset your password</p>
                </div>

                <div class="content">
                  <p class="text">Click the button below to reset your password. This link will expire in 1 hour.</p>
                  <div class="button-container">
                    <a href="${verifyUrl}" class="button">Reset Password</a>
                  </div>
                </div>

                <div class="divider">
                  <p class="small-text">If the button doesn't work, copy and paste this link:</p>
                  <p class="link">${verifyUrl}</p>
                  <p class="small-text">If you didn't request a password reset, you can safely ignore this email.</p>
                </div>

                <div class="footer">
                  <p class="footer-text">&copy; 2026 Virality. All rights reserved.</p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `,
    };
  }

  // Email change
  if (email_action_type === "email_change" || email_action_type === "email_change_current" || email_action_type === "email_change_new") {
    return {
      subject: "Confirm Your Email Change",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            ${baseStyles}
          </head>
          <body>
            <div class="container">
              <div class="card">
                <div class="header">
                  <div class="logo">
                    <img src="https://virality.gg/lovable-uploads/05566301-7c21-4e5b-9e22-a097cbaf1442.png" alt="Virality" height="40" style="height: 40px;" />
                  </div>
                  <h1 class="title">Confirm Email Change</h1>
                  <p class="subtitle">Verify your new email address</p>
                </div>

                <div class="content">
                  <p class="text">You requested to change your email address. Enter this code to confirm:</p>
                  <div class="otp-container">
                    <div class="otp-code">${token}</div>
                  </div>
                </div>

                <div class="divider">
                  <p class="small-text">Or click the button below:</p>
                  <div class="button-container">
                    <a href="${verifyUrl}" class="button">Confirm Email Change</a>
                  </div>
                  <p class="small-text" style="margin-top: 16px;">If you didn't request this change, please secure your account immediately.</p>
                </div>

                <div class="footer">
                  <p class="footer-text">&copy; 2026 Virality. All rights reserved.</p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `,
    };
  }

  // Invite
  if (email_action_type === "invite") {
    return {
      subject: "You've Been Invited to Virality",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            ${baseStyles}
          </head>
          <body>
            <div class="container">
              <div class="card">
                <div class="header">
                  <div class="logo">
                    <img src="https://virality.gg/lovable-uploads/05566301-7c21-4e5b-9e22-a097cbaf1442.png" alt="Virality" height="40" style="height: 40px;" />
                  </div>
                  <h1 class="title">You're Invited!</h1>
                  <p class="subtitle">Join Virality and start earning from your content</p>
                </div>

                <div class="content">
                  <p class="text">You've been invited to create an account on Virality. Click the button below to accept your invitation and get started.</p>
                  <div class="button-container">
                    <a href="${verifyUrl}" class="button">Accept Invitation</a>
                  </div>
                </div>

                <div class="footer">
                  <p class="footer-text">&copy; 2026 Virality. All rights reserved.</p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `,
    };
  }

  // Reauthentication
  if (email_action_type === "reauthentication") {
    return {
      subject: `Virality Security Code: ${token}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            ${baseStyles}
          </head>
          <body>
            <div class="container">
              <div class="card">
                <div class="header">
                  <div class="logo">
                    <img src="https://virality.gg/lovable-uploads/05566301-7c21-4e5b-9e22-a097cbaf1442.png" alt="Virality" height="40" style="height: 40px;" />
                  </div>
                  <h1 class="title">Security Verification</h1>
                  <p class="subtitle">Confirm your identity to continue</p>
                </div>

                <div class="content">
                  <p class="text">You're performing a sensitive action. Enter this code to verify your identity:</p>
                  <div class="otp-container">
                    <div class="otp-code">${token}</div>
                  </div>
                  <p style="color: #a3a3a3; font-size: 14px; text-align: center; margin: 16px 0 0 0;">
                    This code expires in 5 minutes
                  </p>
                </div>

                <div class="divider">
                  <p class="small-text">If you didn't initiate this action, please secure your account immediately.</p>
                </div>

                <div class="footer">
                  <p class="footer-text">&copy; 2026 Virality. All rights reserved.</p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `,
    };
  }

  // Default fallback
  return {
    subject: `Your Virality Verification Code: ${token}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          ${baseStyles}
        </head>
        <body>
          <div class="container">
            <div class="card">
              <div class="header">
                <div class="logo">
                  <img src="https://virality.gg/lovable-uploads/05566301-7c21-4e5b-9e22-a097cbaf1442.png" alt="Virality" height="40" style="height: 40px;" />
                </div>
                <h1 class="title">Verification Code</h1>
                <p class="subtitle">Use this code to continue</p>
              </div>

              <div class="content">
                <div class="otp-container">
                  <div class="otp-code">${token}</div>
                </div>
              </div>

              <div class="divider">
                <p class="small-text">Or click the link below:</p>
                <div class="button-container">
                  <a href="${verifyUrl}" class="button">Verify</a>
                </div>
              </div>

              <div class="footer">
                <p class="footer-text">&copy; 2026 Virality. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `,
  };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const emailPayload: EmailPayload = await req.json();

    console.log("Received auth email request:", {
      email: emailPayload.user.email,
      action_type: emailPayload.email_data.email_action_type,
    });

    // Generate email content
    const { subject, html } = generateEmailHTML(emailPayload);

    // Send email via Resend
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "Virality <no-reply@notifications.virality.gg>",
        to: [emailPayload.user.email],
        subject,
        html,
      }),
    });

    const emailResult = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error("Resend API error:", emailResult);
      return new Response(
        JSON.stringify({
          error: {
            http_code: emailResponse.status,
            message: emailResult.message || "Failed to send email",
          },
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    console.log("Email sent successfully:", emailResult);

    // Return empty object to indicate success to Supabase Auth
    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in send-auth-email hook:", error);
    return new Response(
      JSON.stringify({
        error: {
          http_code: 500,
          message: error.message || "Internal server error",
        },
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
