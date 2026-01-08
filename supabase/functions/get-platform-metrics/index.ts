import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PlatformMetrics {
  database: {
    size_bytes: number;
    size_formatted: string;
    connections_active: number;
    connections_idle: number;
    connections_max: number;
    cache_hit_ratio: number;
    deadlocks: number;
    slow_queries: number;
  };
  storage: {
    total_size_bytes: number;
    total_size_formatted: string;
    object_count: number;
    bucket_count: number;
  };
  edge_functions: {
    total_invocations_24h: number;
    avg_execution_time_ms: number;
    error_count_24h: number;
    function_count: number;
  };
  realtime: {
    active_connections: number;
    channels_count: number;
    messages_24h: number;
  };
  api: {
    requests_24h: number;
    avg_response_time_ms: number;
    error_rate_percent: number;
  };
  system: {
    uptime_seconds: number;
    last_restart: string | null;
  };
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin access
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user is admin
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch database stats
    const { data: dbStats } = await supabase.rpc("get_database_stats").maybeSingle();

    // Fetch connection stats
    const { data: connStats } = await supabase
      .from("pg_stat_activity")
      .select("state")
      .then(() => null) // This won't work directly, need to use RPC
      .catch(() => null);

    // Get database size using RPC
    const { data: dbSize } = await supabase.rpc("get_db_size").maybeSingle();

    // Get storage stats
    const { data: storageStats, error: storageError } = await supabase
      .from("storage.objects")
      .select("id, bucket_id, metadata", { count: "exact", head: false });

    let storageTotalSize = 0;
    let objectCount = 0;
    const bucketIds = new Set<string>();

    if (!storageError && storageStats) {
      objectCount = storageStats.length;
      for (const obj of storageStats) {
        if (obj.metadata && typeof obj.metadata === "object" && "size" in obj.metadata) {
          storageTotalSize += Number(obj.metadata.size) || 0;
        }
        if (obj.bucket_id) {
          bucketIds.add(obj.bucket_id);
        }
      }
    }

    // Get edge function invocation count from logs (last 24h)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Count edge function invocations from a hypothetical log table
    // In reality, this would come from Supabase logs API or a custom tracking table
    const { count: edgeFunctionInvocations } = await supabase
      .from("edge_function_logs")
      .select("*", { count: "exact", head: true })
      .gte("created_at", twentyFourHoursAgo)
      .catch(() => ({ count: null }));

    // Get API request estimates from campaign_analytics or similar high-traffic table
    const { count: apiRequests24h } = await supabase
      .from("campaign_analytics")
      .select("*", { count: "exact", head: true })
      .gte("created_at", twentyFourHoursAgo);

    // Get realtime subscription count (approximation from active sessions)
    const { count: realtimeConnections } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("last_seen_at", new Date(Date.now() - 5 * 60 * 1000).toISOString());

    // Build metrics response with available data
    const metrics: PlatformMetrics = {
      database: {
        size_bytes: dbSize?.size_bytes || 0,
        size_formatted: formatBytes(dbSize?.size_bytes || 0),
        connections_active: dbStats?.active_connections || 0,
        connections_idle: dbStats?.idle_connections || 0,
        connections_max: 100, // Default max connections
        cache_hit_ratio: dbStats?.cache_hit_ratio || 0,
        deadlocks: dbStats?.deadlocks || 0,
        slow_queries: dbStats?.slow_queries || 0,
      },
      storage: {
        total_size_bytes: storageTotalSize,
        total_size_formatted: formatBytes(storageTotalSize),
        object_count: objectCount,
        bucket_count: bucketIds.size,
      },
      edge_functions: {
        total_invocations_24h: edgeFunctionInvocations || 0,
        avg_execution_time_ms: 0, // Would need logs API
        error_count_24h: 0, // Would need logs API
        function_count: 0, // Would need Management API
      },
      realtime: {
        active_connections: realtimeConnections || 0,
        channels_count: 0, // Would need realtime API
        messages_24h: 0, // Would need logs
      },
      api: {
        requests_24h: apiRequests24h || 0,
        avg_response_time_ms: 0, // Would need logs API
        error_rate_percent: 0, // Would need logs API
      },
      system: {
        uptime_seconds: 0, // Would need Management API
        last_restart: null,
      },
    };

    return new Response(JSON.stringify(metrics), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error fetching platform metrics:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch metrics", details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
