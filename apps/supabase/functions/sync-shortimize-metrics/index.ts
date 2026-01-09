import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ShortimizeVideo {
  ad_id: string;
  username: string;
  platform: string;
  ad_link: string;
  latest_views: number;
  latest_likes: number;
  latest_comments: number;
  latest_shares: number;
  latest_bookmarks: number;
  uploaded_at: string;
  title?: string;
}

interface ShortimizeApiResponse {
  data: ShortimizeVideo[];
  pagination: { total: number };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { brandId, collectionName } = (req.method === "POST" ? (await req.json().catch(() => ({}))) : {}) as {
      brandId?: string;
      collectionName?: string;
    };

    console.log("Starting Shortimize metrics sync...", { brandId, collectionName });

    // Fetch brands with shortimize_api_key configured (optionally filtered)
    let brandsQuery = supabase
      .from("brands")
      .select("id, name, shortimize_api_key, collection_name")
      .not("shortimize_api_key", "is", null);

    if (brandId) {
      brandsQuery = brandsQuery.eq("id", brandId);
    }

    const { data: brands, error: brandsError } = await brandsQuery;

    if (brandsError) {
      throw new Error(`Failed to fetch brands: ${brandsError.message}`);
    }

    if (!brands || brands.length === 0) {
      console.log("No brands with Shortimize API keys found");
      return new Response(
        JSON.stringify({ success: true, message: "No brands to sync", synced: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${brands.length} brands with Shortimize API keys`);

    let totalVideosSynced = 0;
    let totalErrors = 0;
    const brandResults: { brandId: string; brandName: string; videosSynced: number; error?: string }[] = [];

    for (const brand of brands) {
      try {
        console.log(`Processing brand: ${brand.name} (${brand.id})`);

        // Get all collection names for this brand's campaigns and boosts
        const [campaignsResult, boostsResult] = await Promise.all([
          supabase
            .from("campaigns")
            .select("id, shortimize_collection_name")
            .eq("brand_id", brand.id)
            .not("shortimize_collection_name", "is", null),
          supabase
            .from("bounty_campaigns")
            .select("id, shortimize_collection_name")
            .eq("brand_id", brand.id)
            .not("shortimize_collection_name", "is", null),
        ]);

        const collections = new Set<string>();
        
        // Add brand's default collection
        if (brand.collection_name) {
          collections.add(brand.collection_name);
        }

        // Add campaign collections
        campaignsResult.data?.forEach((c) => {
          if (c.shortimize_collection_name) {
            collections.add(c.shortimize_collection_name);
          }
        });

        // Add boost collections
        boostsResult.data?.forEach((b) => {
          if (b.shortimize_collection_name) {
            collections.add(b.shortimize_collection_name);
          }
        });

        if (collections.size === 0) {
          console.log(`No collections found for brand ${brand.name}, skipping`);
          brandResults.push({
            brandId: brand.id,
            brandName: brand.name,
            videosSynced: 0,
            error: "No collections configured",
          });
          continue;
        }

        // If caller provided a single collectionName, only sync that one for speed
        if (collectionName) {
          if (!collections.has(collectionName)) {
            console.log(`Requested collection not found for brand ${brand.name}: ${collectionName}`);
            brandResults.push({
              brandId: brand.id,
              brandName: brand.name,
              videosSynced: 0,
              error: `Collection not configured: ${collectionName}`,
            });
            continue;
          }
          collections.clear();
          collections.add(collectionName);
        }

        console.log(
          `Found ${collections.size} collections for brand ${brand.name}: ${Array.from(collections).join(", ")}`
        );

        // Fetch videos from Shortimize for each collection
        let brandVideosSynced = 0;

        for (const collectionName of collections) {
          try {
            const response = await fetch(
              `https://api.shortimize.com/videos?collections=${encodeURIComponent(collectionName)}&limit=5000&has_metrics=true&order_by=latest_updated_at&order_direction=desc`,
              {
                method: "GET",
                headers: {
                  Authorization: `Bearer ${brand.shortimize_api_key}`,
                },
              }
            );

            if (!response.ok) {
              console.error(`Shortimize API error for collection ${collectionName}: ${response.status}`);
              continue;
            }

            const apiData: ShortimizeApiResponse = await response.json();
            console.log(`Fetched ${apiData.data?.length || 0} videos from collection ${collectionName}`);

            if (!apiData.data || apiData.data.length === 0) {
              continue;
            }

            // Update video_submissions with metrics for each video
            for (const video of apiData.data) {
              const { error: updateError } = await supabase
                .from("video_submissions")
                .update({
                  views: video.latest_views || 0,
                  likes: video.latest_likes || 0,
                  comments: video.latest_comments || 0,
                  shares: video.latest_shares || 0,
                  bookmarks: video.latest_bookmarks || 0,
                  metrics_updated_at: new Date().toISOString(),
                })
                .eq("shortimize_video_id", video.ad_id);

              if (updateError) {
                console.error(`Error updating video ${video.ad_id}: ${updateError.message}`);
              } else {
                brandVideosSynced++;
              }
            }
          } catch (collectionError) {
            console.error(`Error processing collection ${collectionName}:`, collectionError);
          }
        }

        // Aggregate metrics by source (campaign/boost) and insert into program_video_metrics
        await aggregateProgramMetrics(supabase, brand.id);

        totalVideosSynced += brandVideosSynced;
        brandResults.push({
          brandId: brand.id,
          brandName: brand.name,
          videosSynced: brandVideosSynced,
        });

        console.log(`Synced ${brandVideosSynced} videos for brand ${brand.name}`);
      } catch (brandError) {
        console.error(`Error processing brand ${brand.name}:`, brandError);
        totalErrors++;
        brandResults.push({
          brandId: brand.id,
          brandName: brand.name,
          videosSynced: 0,
          error: brandError instanceof Error ? brandError.message : "Unknown error",
        });
      }
    }

    console.log(`Sync complete. Total videos synced: ${totalVideosSynced}, Errors: ${totalErrors}`);

    return new Response(
      JSON.stringify({
        success: true,
        totalVideosSynced,
        totalBrandsProcessed: brands.length,
        totalErrors,
        brandResults,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in sync-shortimize-metrics:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

async function aggregateProgramMetrics(supabase: any, brandId: string) {
  try {
    // Get all video submissions for this brand grouped by source
    const { data: submissions, error } = await supabase
      .from("video_submissions")
      .select("source_type, source_id, views, likes, comments, shares, bookmarks")
      .eq("brand_id", brandId)
      .eq("status", "approved");

    if (error) {
      console.error("Error fetching submissions for aggregation:", error);
      return;
    }

    if (!submissions || submissions.length === 0) {
      return;
    }

    // Group by source_type and source_id
    const aggregated = new Map<string, {
      source_type: string;
      source_id: string;
      total_views: number;
      total_likes: number;
      total_comments: number;
      total_shares: number;
      total_bookmarks: number;
      total_videos: number;
    }>();

    for (const sub of submissions) {
      const key = `${sub.source_type}:${sub.source_id}`;
      const existing = aggregated.get(key) || {
        source_type: sub.source_type,
        source_id: sub.source_id,
        total_views: 0,
        total_likes: 0,
        total_comments: 0,
        total_shares: 0,
        total_bookmarks: 0,
        total_videos: 0,
      };

      aggregated.set(key, {
        ...existing,
        total_views: existing.total_views + (sub.views || 0),
        total_likes: existing.total_likes + (sub.likes || 0),
        total_comments: existing.total_comments + (sub.comments || 0),
        total_shares: existing.total_shares + (sub.shares || 0),
        total_bookmarks: existing.total_bookmarks + (sub.bookmarks || 0),
        total_videos: existing.total_videos + 1,
      });
    }

    // Insert aggregated metrics
    for (const [, metrics] of aggregated) {
      await supabase.from("program_video_metrics").insert({
        source_type: metrics.source_type,
        source_id: metrics.source_id,
        brand_id: brandId,
        total_views: metrics.total_views,
        total_likes: metrics.total_likes,
        total_comments: metrics.total_comments,
        total_shares: metrics.total_shares,
        total_bookmarks: metrics.total_bookmarks,
        total_videos: metrics.total_videos,
        recorded_at: new Date().toISOString(),
      });
    }

    console.log(`Aggregated metrics for ${aggregated.size} programs for brand ${brandId}`);
  } catch (err) {
    console.error("Error aggregating program metrics:", err);
  }
}
