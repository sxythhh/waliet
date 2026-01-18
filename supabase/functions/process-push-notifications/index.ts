// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificationQueueItem {
  id: string;
  user_id: string;
  title: string;
  body: string;
  data: Record<string, any>;
}

interface PushToken {
  token: string;
  platform: string;
}

// Send FCM notification via Firebase HTTP v1 API
async function sendFCMNotification(
  accessToken: string,
  projectId: string,
  token: string,
  title: string,
  body: string,
  data: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
  try {
    const message = {
      message: {
        token,
        notification: {
          title,
          body,
        },
        data: Object.fromEntries(
          Object.entries(data).map(([k, v]) => [k, String(v)])
        ),
        android: {
          priority: "high",
          notification: {
            sound: "default",
            click_action: "FLUTTER_NOTIFICATION_CLICK",
          },
        },
        apns: {
          payload: {
            aps: {
              sound: "default",
              badge: 1,
            },
          },
        },
      },
    };

    const response = await fetch(
      `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(message),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("FCM error:", errorText);
      return { success: false, error: errorText };
    }

    return { success: true };
  } catch (error) {
    console.error("FCM exception:", error);
    return { success: false, error: error.message };
  }
}

// Get OAuth2 access token for Firebase using service account
async function getFirebaseAccessToken(
  serviceAccount: any
): Promise<string | null> {
  try {
    // Create JWT for service account authentication
    const header = { alg: "RS256", typ: "JWT" };
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: serviceAccount.client_email,
      sub: serviceAccount.client_email,
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
    };

    // Encode header and payload
    const encoder = new TextEncoder();
    const headerB64 = btoa(JSON.stringify(header))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    const payloadB64 = btoa(JSON.stringify(payload))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    const signatureInput = `${headerB64}.${payloadB64}`;

    // Import private key and sign
    const privateKeyPem = serviceAccount.private_key;
    const pemContents = privateKeyPem
      .replace("-----BEGIN PRIVATE KEY-----", "")
      .replace("-----END PRIVATE KEY-----", "")
      .replace(/\s/g, "");
    const binaryKey = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

    const cryptoKey = await crypto.subtle.importKey(
      "pkcs8",
      binaryKey,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signature = await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      cryptoKey,
      encoder.encode(signatureInput)
    );

    const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    const jwt = `${signatureInput}.${signatureB64}`;

    // Exchange JWT for access token
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    });

    if (!tokenResponse.ok) {
      console.error("Token exchange failed:", await tokenResponse.text());
      return null;
    }

    const tokenData = await tokenResponse.json();
    return tokenData.access_token;
  } catch (error) {
    console.error("Error getting Firebase access token:", error);
    return null;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const firebaseServiceAccountJson = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");

    if (!firebaseServiceAccountJson) {
      console.log("Firebase service account not configured, skipping push notifications");
      return new Response(
        JSON.stringify({ success: true, message: "Push notifications not configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const firebaseServiceAccount = JSON.parse(firebaseServiceAccountJson);
    const projectId = firebaseServiceAccount.project_id;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get Firebase access token
    const accessToken = await getFirebaseAccessToken(firebaseServiceAccount);
    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: "Failed to get Firebase access token" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch pending notifications (limit to 100 per run)
    const { data: pendingNotifications, error: fetchError } = await supabase
      .from("notification_queue")
      .select("id, user_id, title, body, data")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(100);

    if (fetchError) {
      console.error("Error fetching notifications:", fetchError);
      return new Response(
        JSON.stringify({ error: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!pendingNotifications || pendingNotifications.length === 0) {
      return new Response(
        JSON.stringify({ success: true, processed: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing ${pendingNotifications.length} notifications`);

    let sent = 0;
    let failed = 0;

    for (const notification of pendingNotifications as NotificationQueueItem[]) {
      // Get user's push tokens
      const { data: tokens, error: tokensError } = await supabase
        .from("push_tokens")
        .select("token, platform")
        .eq("user_id", notification.user_id);

      if (tokensError || !tokens || tokens.length === 0) {
        // No tokens, mark as failed
        await supabase
          .from("notification_queue")
          .update({
            status: "failed",
            error_message: "No push tokens found for user",
            sent_at: new Date().toISOString(),
          })
          .eq("id", notification.id);
        failed++;
        continue;
      }

      // Send to all user's devices
      let anySuccess = false;
      const errors: string[] = [];

      for (const tokenInfo of tokens as PushToken[]) {
        const result = await sendFCMNotification(
          accessToken,
          projectId,
          tokenInfo.token,
          notification.title,
          notification.body,
          notification.data || {}
        );

        if (result.success) {
          anySuccess = true;
        } else {
          errors.push(result.error || "Unknown error");

          // If token is invalid, remove it
          if (result.error?.includes("NOT_FOUND") || result.error?.includes("UNREGISTERED")) {
            await supabase
              .from("push_tokens")
              .delete()
              .eq("token", tokenInfo.token);
            console.log("Removed invalid token:", tokenInfo.token.substring(0, 20) + "...");
          }
        }
      }

      // Update notification status
      if (anySuccess) {
        await supabase
          .from("notification_queue")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
          })
          .eq("id", notification.id);
        sent++;
      } else {
        await supabase
          .from("notification_queue")
          .update({
            status: "failed",
            error_message: errors.join("; "),
            sent_at: new Date().toISOString(),
          })
          .eq("id", notification.id);
        failed++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: pendingNotifications.length,
        sent,
        failed,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in process-push-notifications:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
