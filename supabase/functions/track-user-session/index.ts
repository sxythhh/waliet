import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple hash function for IP anonymization
function hashIP(ip: string): string {
  let hash = 0;
  for (let i = 0; i < ip.length; i++) {
    const char = ip.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

// Parse user agent to extract device, browser, and OS info
function parseUserAgent(ua: string): { 
  device: string; 
  browser: string; 
  browserVersion: string;
  os: string 
} {
  let device = "Desktop";
  let browser = "Unknown";
  let browserVersion = "";
  let os = "Unknown";

  // Detect OS - check mobile platforms FIRST before desktop
  if (ua.includes("iPhone")) {
    os = "iOS";
    device = "Mobile";
  } else if (ua.includes("iPad")) {
    os = "iOS";
    device = "Tablet";
  } else if (ua.includes("Android")) {
    os = "Android";
    // Check device type for Android
    if (ua.includes("Mobile")) {
      device = "Mobile";
    } else if (ua.includes("Tablet")) {
      device = "Tablet";
    } else {
      device = "Mobile"; // Default Android to mobile
    }
  } else if (ua.includes("Windows")) {
    os = "Windows";
  } else if (ua.includes("Mac OS X") || ua.includes("Macintosh")) {
    os = "macOS";
  } else if (ua.includes("CrOS")) {
    os = "Chrome OS";
  } else if (ua.includes("Linux")) {
    os = "Linux";
  }

  // Detect browser and version
  const chromeMatch = ua.match(/Chrome\/(\d+\.\d+\.\d+\.\d+)/);
  const firefoxMatch = ua.match(/Firefox\/(\d+\.\d+)/);
  const safariMatch = ua.match(/Version\/(\d+\.\d+).*Safari/);
  const edgeMatch = ua.match(/Edg\/(\d+\.\d+\.\d+\.\d+)/);
  const operaMatch = ua.match(/OPR\/(\d+\.\d+\.\d+\.\d+)/);

  if (edgeMatch) {
    browser = "Edge";
    browserVersion = edgeMatch[1];
  } else if (operaMatch) {
    browser = "Opera";
    browserVersion = operaMatch[1];
  } else if (chromeMatch && !ua.includes("Edg") && !ua.includes("OPR")) {
    browser = "Chrome";
    browserVersion = chromeMatch[1];
  } else if (firefoxMatch) {
    browser = "Firefox";
    browserVersion = firefoxMatch[1];
  } else if (safariMatch && !ua.includes("Chrome")) {
    browser = "Safari";
    browserVersion = safariMatch[1];
  }

  return { device, browser, browserVersion, os };
}

// Get device display name based on OS
function getDeviceName(os: string, device: string): string {
  if (os === "macOS") return "Macintosh";
  if (os === "Windows") return "Windows PC";
  if (os === "iOS" && device === "Mobile") return "iPhone";
  if (os === "iOS" && device === "Tablet") return "iPad";
  if (os === "Android" && device === "Mobile") return "Android Phone";
  if (os === "Android" && device === "Tablet") return "Android Tablet";
  if (os === "Linux") return "Linux PC";
  if (os === "Chrome OS") return "Chromebook";
  return `${os} Device`;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get request body
    const { userId, sessionId } = await req.json();

    if (!userId || !sessionId) {
      console.error("Missing required fields:", { userId, sessionId });
      return new Response(
        JSON.stringify({ error: "Missing userId or sessionId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user agent from headers
    const userAgent = req.headers.get("user-agent") || "";
    
    // Get IP from various headers (Cloudflare, etc.)
    const ip = req.headers.get("cf-connecting-ip") || 
               req.headers.get("x-real-ip") || 
               req.headers.get("x-forwarded-for")?.split(",")[0] || 
               "unknown";
    
    // Get location from Cloudflare headers
    const country = req.headers.get("cf-ipcountry") || null;
    const city = req.headers.get("cf-ipcity") || null;

    console.log("Session tracking request:", {
      userId,
      sessionId,
      ip: hashIP(ip),
      country,
      city,
      userAgent: userAgent.substring(0, 100)
    });

    // Parse user agent
    const { device, browser, browserVersion, os } = parseUserAgent(userAgent);
    const deviceName = getDeviceName(os, device);

    // Hash the IP for privacy
    const hashedIp = ip !== "unknown" ? hashIP(ip) : null;

    // Update user's profile with location if available
    if (country || city) {
      const profileUpdate: Record<string, string> = {};
      if (country) profileUpdate.country = country;
      if (city) profileUpdate.city = city;

      const { error: profileError } = await supabase
        .from("profiles")
        .update(profileUpdate)
        .eq("id", userId);

      if (profileError) {
        console.error("Error updating profile location:", profileError);
      } else {
        console.log("Updated profile location:", { country, city });
      }
    }

    // Clear is_current flag from all existing sessions for this user
    await supabase
      .from("user_sessions")
      .update({ is_current: false })
      .eq("user_id", userId);

    // Use upsert to handle race conditions and duplicates gracefully
    // The unique constraint is on (user_id, session_id)
    const { data: session, error: sessionError } = await supabase
      .from("user_sessions")
      .upsert({
        user_id: userId,
        session_id: sessionId,
        device_type: device,
        os: os,
        browser: browser,
        browser_version: browserVersion,
        ip_address: hashedIp,
        country: country,
        city: city,
        is_current: true,
        last_active_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,session_id',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (sessionError) {
      console.error("Error upserting session:", sessionError);
      return new Response(
        JSON.stringify({ error: "Failed to track session", details: sessionError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Session tracked successfully:", {
      sessionId: session?.id,
      device: deviceName,
      browser: `${browser} ${browserVersion}`,
      location: `${city || "Unknown"}, ${country || "Unknown"}`
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        session,
        deviceInfo: {
          device: deviceName,
          browser: `${browser} ${browserVersion}`,
          os,
          location: city && country ? `${city}, ${country}` : null
        }
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Unexpected error in track-user-session:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
