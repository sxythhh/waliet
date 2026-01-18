import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const DISCORD_OPS_WEBHOOK_URL = Deno.env.get("DISCORD_OPS_WEBHOOK_URL");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OpsAlertRequest {
  severity: "info" | "warning" | "critical";
  title: string;
  message: string;
  metadata?: Record<string, any>;
}

const severityColors: Record<string, number> = {
  info: 0x3b82f6,     // Blue
  warning: 0xf59e0b,  // Amber
  critical: 0xef4444, // Red
};

const severityEmojis: Record<string, string> = {
  info: "info",
  warning: "warning",
  critical: "rotating_light",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { severity, title, message, metadata }: OpsAlertRequest = await req.json();

    console.log("Sending ops alert:", { severity, title });

    if (!DISCORD_OPS_WEBHOOK_URL) {
      console.log("DISCORD_OPS_WEBHOOK_URL not configured, skipping alert");
      return new Response(JSON.stringify({ message: "Webhook not configured" }), {
        status: 200,
        headers: corsHeaders,
      });
    }

    // Build Discord embed
    const embed: any = {
      title: `${title}`,
      description: message,
      color: severityColors[severity] || severityColors.info,
      timestamp: new Date().toISOString(),
      footer: {
        text: `Virality Ops | ${severity.toUpperCase()}`,
      },
    };

    // Add metadata as fields if provided
    if (metadata && Object.keys(metadata).length > 0) {
      embed.fields = Object.entries(metadata)
        .slice(0, 10) // Discord limit
        .map(([key, value]) => ({
          name: key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
          value: typeof value === "object" ? JSON.stringify(value).slice(0, 100) : String(value).slice(0, 100),
          inline: true,
        }));
    }

    // Send to Discord webhook
    const discordResponse = await fetch(DISCORD_OPS_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: severity === "critical" ? "@here" : undefined,
        embeds: [embed],
      }),
    });

    if (!discordResponse.ok) {
      const errorText = await discordResponse.text();
      console.error("Discord webhook failed:", discordResponse.status, errorText);
      return new Response(JSON.stringify({ error: "Discord webhook failed" }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    console.log("Ops alert sent successfully");

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending ops alert:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
