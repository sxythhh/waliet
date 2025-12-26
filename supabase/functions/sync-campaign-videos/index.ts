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
  caption?: string;
  description?: string;
  thumbnail_url?: string;
}

interface ShortimizeApiResponse {
  data: ShortimizeVideo[];
  pagination: { total: number };
}

interface SyncResult {
  campaignId: string;
  campaignTitle: string;
  videosFound: number;
  videosMatched: number;
  videosUnmatched: number;
  accountsUpdated: string[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { brandId, campaignId } = (req.method === "POST" ? (await req.json().catch(() => ({}))) : {}) as {
      brandId?: string;
      campaignId?: string;
    };

    console.log("Starting comprehensive campaign video sync...", { brandId, campaignId });

    // Fetch brands with shortimize_api_key configured
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

    const results: {
      brandId: string;
      brandName: string;
      campaigns: SyncResult[];
      error?: string;
    }[] = [];

    let totalVideosMatched = 0;
    let totalVideosUnmatched = 0;

    for (const brand of brands) {
      try {
        console.log(`Processing brand: ${brand.name} (${brand.id})`);

        // Get all campaigns for this brand (with hashtags for filtering)
        let campaignsQuery = supabase
          .from("campaigns")
          .select("id, title, shortimize_collection_name, hashtags, brand_id, payment_model, rpm_rate")
          .eq("brand_id", brand.id)
          .eq("status", "active");

        if (campaignId) {
          campaignsQuery = campaignsQuery.eq("id", campaignId);
        }

        const { data: campaigns, error: campaignsError } = await campaignsQuery;

        if (campaignsError) {
          console.error(`Error fetching campaigns for brand ${brand.name}:`, campaignsError);
          results.push({
            brandId: brand.id,
            brandName: brand.name,
            campaigns: [],
            error: campaignsError.message,
          });
          continue;
        }

        if (!campaigns || campaigns.length === 0) {
          console.log(`No active campaigns for brand ${brand.name}`);
          results.push({
            brandId: brand.id,
            brandName: brand.name,
            campaigns: [],
          });
          continue;
        }

        console.log(`Found ${campaigns.length} active campaigns for brand ${brand.name}`);

        const brandCampaignResults: SyncResult[] = [];

        for (const campaign of campaigns) {
          try {
            // Determine collection to use (campaign-specific or brand default)
            const collectionName = campaign.shortimize_collection_name || brand.collection_name;
            const campaignHashtags = campaign.hashtags as string[] | null;

            // Need either a collection OR hashtags to sync
            if (!collectionName && (!campaignHashtags || campaignHashtags.length === 0)) {
              console.log(`No collection or hashtags configured for campaign ${campaign.title}, skipping`);
              brandCampaignResults.push({
                campaignId: campaign.id,
                campaignTitle: campaign.title,
                videosFound: 0,
                videosMatched: 0,
                videosUnmatched: 0,
                accountsUpdated: [],
              });
              continue;
            }

            // Build API URL - if no collection, use brand's default collection or fetch all
            let apiUrl: string;
            if (collectionName) {
              apiUrl = `https://api.shortimize.com/videos?collections=${encodeURIComponent(collectionName)}&limit=5000&has_metrics=true&order_by=latest_updated_at&order_direction=desc`;
            } else {
              // No collection but has hashtags - fetch from brand's all videos or a default collection
              // Try to get videos without collection filter (recent videos)
              apiUrl = `https://api.shortimize.com/videos?limit=5000&has_metrics=true&order_by=latest_updated_at&order_direction=desc`;
            }

            console.log(`Fetching videos for campaign: ${campaign.title}${collectionName ? ` from collection: ${collectionName}` : ' (all videos, filtered by hashtags)'}`);

            const response = await fetch(apiUrl, {
              method: "GET",
              headers: {
                Authorization: `Bearer ${brand.shortimize_api_key}`,
              },
            });

            if (!response.ok) {
              console.error(`Shortimize API error for campaign ${campaign.title}: ${response.status}`);
              brandCampaignResults.push({
                campaignId: campaign.id,
                campaignTitle: campaign.title,
                videosFound: 0,
                videosMatched: 0,
                videosUnmatched: 0,
                accountsUpdated: [],
                error: `Shortimize API error: ${response.status}`,
              } as SyncResult & { error: string });
              continue;
            }

            const apiData: ShortimizeApiResponse = await response.json();
            console.log(`Fetched ${apiData.data?.length || 0} videos from Shortimize`);

            if (!apiData.data || apiData.data.length === 0) {
              brandCampaignResults.push({
                campaignId: campaign.id,
                campaignTitle: campaign.title,
                videosFound: 0,
                videosMatched: 0,
                videosUnmatched: 0,
                accountsUpdated: [],
              });
              continue;
            }

            // Filter videos by campaign hashtags if configured
            let filteredVideos = apiData.data;

            if (campaignHashtags && campaignHashtags.length > 0) {
              console.log(`Filtering videos by hashtags: ${campaignHashtags.join(", ")}`);
              filteredVideos = apiData.data.filter((video) => {
                const searchText = `${video.title || ""} ${video.caption || ""} ${video.description || ""}`.toLowerCase();
                return campaignHashtags.some((tag) => {
                  const normalizedTag = tag.toLowerCase().replace(/^#/, "");
                  return searchText.includes(`#${normalizedTag}`) || searchText.includes(normalizedTag);
                });
              });
              console.log(`After hashtag filtering: ${filteredVideos.length} videos`);
            }

            // Get all social accounts linked to this campaign
            const { data: linkedAccounts, error: accountsError } = await supabase
              .from("social_account_campaigns")
              .select(`
                social_account_id,
                social_accounts:social_account_id (
                  id,
                  user_id,
                  username,
                  platform
                )
              `)
              .eq("campaign_id", campaign.id)
              .eq("status", "active");

            if (accountsError) {
              console.error(`Error fetching linked accounts for campaign ${campaign.title}:`, accountsError);
            }

            // Build username->account mapping for fast lookup
            const accountMap = new Map<string, { id: string; user_id: string; username: string; platform: string }>();
            if (linkedAccounts) {
              for (const link of linkedAccounts) {
                const account = link.social_accounts as unknown as { id: string; user_id: string; username: string; platform: string } | null;
                if (account && account.id) {
                  // Key: lowercase platform:username
                  const key = `${account.platform.toLowerCase()}:${account.username.toLowerCase()}`;
                  accountMap.set(key, account);
                }
              }
            }

            console.log(`Found ${accountMap.size} linked accounts for campaign ${campaign.title}`);

            // Calculate week start date for weekly tracking
            const today = new Date();
            const dayOfWeek = today.getDay();
            const weekStart = new Date(today);
            weekStart.setDate(today.getDate() - dayOfWeek);
            weekStart.setHours(0, 0, 0, 0);
            const weekStartDate = weekStart.toISOString().split("T")[0];

            let matchedCount = 0;
            let unmatchedCount = 0;
            const updatedAccounts = new Set<string>();

            // Process each video
            for (const video of filteredVideos) {
              const videoKey = `${video.platform.toLowerCase()}:${video.username.toLowerCase()}`;
              const matchedAccount = accountMap.get(videoKey);

              // Upsert to cached_campaign_videos
              const videoData = {
                brand_id: brand.id,
                campaign_id: campaign.id,
                shortimize_video_id: video.ad_id,
                username: video.username,
                platform: video.platform,
                video_url: video.ad_link,
                title: video.title || null,
                caption: video.caption || null,
                description: video.description || null,
                thumbnail_url: video.thumbnail_url || null,
                views: video.latest_views || 0,
                likes: video.latest_likes || 0,
                comments: video.latest_comments || 0,
                shares: video.latest_shares || 0,
                bookmarks: video.latest_bookmarks || 0,
                uploaded_at: video.uploaded_at || null,
                cached_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                // User/account matching
                user_id: matchedAccount?.user_id || null,
                social_account_id: matchedAccount?.id || null,
                matched_at: matchedAccount ? new Date().toISOString() : null,
              };

              // Check if we need to update week_start_views
              const { data: existing } = await supabase
                .from("cached_campaign_videos")
                .select("id, week_start_date, week_start_views")
                .eq("shortimize_video_id", video.ad_id)
                .eq("campaign_id", campaign.id)
                .single();

              // If week changed or no existing record, reset week_start_views
              if (!existing || existing.week_start_date !== weekStartDate) {
                (videoData as any).week_start_views = video.latest_views || 0;
                (videoData as any).week_start_date = weekStartDate;
              }

              const { error: upsertError } = await supabase
                .from("cached_campaign_videos")
                .upsert(videoData, {
                  onConflict: "shortimize_video_id,campaign_id",
                  ignoreDuplicates: false,
                });

              if (upsertError) {
                // Try insert if upsert fails (likely no unique constraint)
                if (existing) {
                  await supabase
                    .from("cached_campaign_videos")
                    .update(videoData)
                    .eq("id", existing.id);
                } else {
                  const { error: insertError } = await supabase
                    .from("cached_campaign_videos")
                    .insert(videoData);
                  if (insertError) {
                    console.error(`Error inserting video ${video.ad_id}:`, insertError.message);
                  }
                }
              }

            if (matchedAccount) {
              matchedCount++;
              updatedAccounts.add(video.username);

              // Create/update video_submission for matched videos (source='tracked')
              // This enables the payment processing pipeline
              const submissionData = {
                source_type: "campaign",
                source_id: campaign.id,
                brand_id: brand.id,
                creator_id: matchedAccount.user_id,
                video_url: video.ad_link,
                platform: video.platform,
                shortimize_video_id: video.ad_id,
                status: "pending", // Requires brand approval like regular submissions
                source: "tracked",
                video_title: video.title || null,
                video_description: video.caption || video.description || null,
                video_thumbnail_url: video.thumbnail_url || null,
                video_author_username: video.username,
                video_upload_date: video.uploaded_at || null,
                views: video.latest_views || 0,
                likes: video.latest_likes || 0,
                comments: video.latest_comments || 0,
                shares: video.latest_shares || 0,
                bookmarks: video.latest_bookmarks || 0,
                social_account_id: matchedAccount.id,
                submitted_at: video.uploaded_at || new Date().toISOString(),
                metrics_updated_at: new Date().toISOString(),
              };

              const { error: submissionError } = await supabase
                .from("video_submissions")
                .upsert(submissionData, {
                  onConflict: "shortimize_video_id,source_id",
                  ignoreDuplicates: false,
                });

              if (submissionError) {
                console.error(`Error upserting video_submission for ${video.ad_id}:`, submissionError.message);
              }
            } else {
              unmatchedCount++;
            }
            }

            totalVideosMatched += matchedCount;
            totalVideosUnmatched += unmatchedCount;

            // Record metrics snapshot for the performance chart
            // Aggregate totals from all approved video_submissions for this campaign
            const { data: submissionTotals } = await supabase
              .from("video_submissions")
              .select("views, likes, comments, shares, bookmarks")
              .eq("source_type", "campaign")
              .eq("source_id", campaign.id)
              .eq("status", "approved");

            if (submissionTotals && submissionTotals.length > 0) {
              const totalViews = submissionTotals.reduce((sum, s) => sum + (s.views || 0), 0);
              const totalLikes = submissionTotals.reduce((sum, s) => sum + (s.likes || 0), 0);
              const totalComments = submissionTotals.reduce((sum, s) => sum + (s.comments || 0), 0);
              const totalShares = submissionTotals.reduce((sum, s) => sum + (s.shares || 0), 0);
              const totalBookmarks = submissionTotals.reduce((sum, s) => sum + (s.bookmarks || 0), 0);
              const totalVideos = submissionTotals.length;

              // Insert metrics snapshot
              const { error: metricsError } = await supabase
                .from("program_video_metrics")
                .insert({
                  source_type: "campaign",
                  source_id: campaign.id,
                  brand_id: brand.id,
                  total_views: totalViews,
                  total_likes: totalLikes,
                  total_comments: totalComments,
                  total_shares: totalShares,
                  total_bookmarks: totalBookmarks,
                  total_videos: totalVideos,
                  recorded_at: new Date().toISOString(),
                });

              if (metricsError) {
                console.error(`Error recording metrics for campaign ${campaign.id}:`, metricsError.message);
              } else {
                console.log(`Recorded metrics snapshot: ${totalViews} views, ${totalVideos} videos`);
              }
            }

            brandCampaignResults.push({
              campaignId: campaign.id,
              campaignTitle: campaign.title,
              videosFound: filteredVideos.length,
              videosMatched: matchedCount,
              videosUnmatched: unmatchedCount,
              accountsUpdated: Array.from(updatedAccounts),
            });

            console.log(
              `Campaign ${campaign.title}: ${filteredVideos.length} videos, ${matchedCount} matched, ${unmatchedCount} unmatched`
            );
          } catch (campaignError) {
            console.error(`Error processing campaign ${campaign.title}:`, campaignError);
            brandCampaignResults.push({
              campaignId: campaign.id,
              campaignTitle: campaign.title,
              videosFound: 0,
              videosMatched: 0,
              videosUnmatched: 0,
              accountsUpdated: [],
              error: campaignError instanceof Error ? campaignError.message : "Unknown error",
            } as SyncResult & { error: string });
          }
        }

        results.push({
          brandId: brand.id,
          brandName: brand.name,
          campaigns: brandCampaignResults,
        });
      } catch (brandError) {
        console.error(`Error processing brand ${brand.name}:`, brandError);
        results.push({
          brandId: brand.id,
          brandName: brand.name,
          campaigns: [],
          error: brandError instanceof Error ? brandError.message : "Unknown error",
        });
      }
    }

    console.log(
      `Sync complete. Total matched: ${totalVideosMatched}, Total unmatched: ${totalVideosUnmatched}`
    );

    return new Response(
      JSON.stringify({
        success: true,
        totalVideosMatched,
        totalVideosUnmatched,
        totalBrandsProcessed: brands.length,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in sync-campaign-videos:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
