import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { DollarSign, UserPlus } from "lucide-react";
import { OptimizedImage } from "@/components/OptimizedImage";
import { useNavigate } from "react-router-dom";

interface ActivityItem {
  id: string;
  type: "earning" | "join";
  amount?: number;
  description: string;
  created_at: string;
  username?: string;
  platform?: string;
  campaign_name?: string;
  campaign_slug?: string;
  brand_logo_url?: string;
  is_private?: boolean;
}

export function RecentActivity() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchActivities = async () => {
      // Fetch earnings with campaign info
      const { data: earnings } = await supabase
        .from("wallet_transactions")
        .select("id, amount, type, description, created_at, metadata, user_id")
        .eq("type", "earning")
        .gt("amount", 0)
        .order("created_at", { ascending: false })
        .limit(10);

      // Fetch campaign joins (submissions) with campaign and profile info
      const { data: joins } = await supabase
        .from("campaign_submissions")
        .select(`
          id,
          submitted_at,
          platform,
          campaign_id,
          creator_id
        `)
        .order("submitted_at", { ascending: false })
        .limit(10);

      const formattedActivities: ActivityItem[] = [];

      // Process earnings
      if (earnings) {
        for (const earning of earnings) {
          const metadata = (earning.metadata as { account_username?: string; platform?: string; campaign_id?: string }) || {};
          let campaignName = "Campaign";
          let campaignSlug: string | undefined;
          let brandLogoUrl: string | undefined;
          let isPrivate = false;

          // Get campaign info
          if (metadata.campaign_id) {
            const { data: campaign } = await supabase
              .from("campaigns")
              .select("title, slug, brand_logo_url")
              .eq("id", metadata.campaign_id)
              .single();
            if (campaign) {
              campaignName = campaign.title;
              campaignSlug = campaign.slug || undefined;
              brandLogoUrl = campaign.brand_logo_url || undefined;
            }
          }

          // Get user privacy setting
          if (earning.user_id) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("is_private")
              .eq("id", earning.user_id)
              .single();
            if (profile) {
              isPrivate = profile.is_private || false;
            }
          }

          formattedActivities.push({
            id: earning.id,
            type: "earning",
            amount: earning.amount,
            description: earning.description,
            created_at: earning.created_at,
            username: metadata.account_username,
            platform: metadata.platform,
            campaign_name: campaignName,
            campaign_slug: campaignSlug,
            brand_logo_url: brandLogoUrl,
            is_private: isPrivate,
          });
        }
      }

      // Process joins
      if (joins) {
        for (const join of joins) {
          let campaignName = "Campaign";
          let campaignSlug: string | undefined;
          let brandLogoUrl: string | undefined;
          let isPrivate = false;
          let username: string | undefined;

          // Get campaign info
          const { data: campaign } = await supabase
            .from("campaigns")
            .select("title, slug, brand_logo_url")
            .eq("id", join.campaign_id)
            .single();
          if (campaign) {
            campaignName = campaign.title;
            campaignSlug = campaign.slug || undefined;
            brandLogoUrl = campaign.brand_logo_url || undefined;
          }

          // Get user privacy setting and username
          if (join.creator_id) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("username, is_private")
              .eq("id", join.creator_id)
              .single();
            if (profile) {
              isPrivate = profile.is_private || false;
              username = profile.username || undefined;
            }
          }

          formattedActivities.push({
            id: join.id,
            type: "join",
            description: "Joined campaign",
            created_at: join.submitted_at || new Date().toISOString(),
            username,
            platform: join.platform || undefined,
            campaign_name: campaignName,
            campaign_slug: campaignSlug,
            brand_logo_url: brandLogoUrl,
            is_private: isPrivate,
          });
        }
      }

      // Sort by created_at and take top 10
      formattedActivities.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setActivities(formattedActivities.slice(0, 10));
      setLoading(false);
    };

    fetchActivities();

    // Set up realtime subscription for earnings
    const channel = supabase
      .channel("recent-activity")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "wallet_transactions",
        },
        async (payload) => {
          const newTransaction = payload.new as {
            id: string;
            type: string;
            amount: number;
            description: string;
            created_at: string;
            user_id?: string;
            metadata: { account_username?: string; platform?: string; campaign_id?: string } | null;
          };
          if (newTransaction.type === "earning" && newTransaction.amount > 0) {
            const metadata = newTransaction.metadata || {};
            let campaignName = "Campaign";
            let campaignSlug: string | undefined;
            let brandLogoUrl: string | undefined;
            let isPrivate = false;

            if (metadata.campaign_id) {
              const { data: campaign } = await supabase
                .from("campaigns")
                .select("title, slug, brand_logo_url")
                .eq("id", metadata.campaign_id)
                .single();
              if (campaign) {
                campaignName = campaign.title;
                campaignSlug = campaign.slug || undefined;
                brandLogoUrl = campaign.brand_logo_url || undefined;
              }
            }

            if (newTransaction.user_id) {
              const { data: profile } = await supabase
                .from("profiles")
                .select("is_private")
                .eq("id", newTransaction.user_id)
                .single();
              if (profile) {
                isPrivate = profile.is_private || false;
              }
            }

            const newActivity: ActivityItem = {
              id: newTransaction.id,
              type: "earning",
              amount: newTransaction.amount,
              description: newTransaction.description,
              created_at: newTransaction.created_at,
              username: metadata.account_username,
              platform: metadata.platform,
              campaign_name: campaignName,
              campaign_slug: campaignSlug,
              brand_logo_url: brandLogoUrl,
              is_private: isPrivate,
            };
            setActivities((prev) => [newActivity, ...prev.slice(0, 9)]);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "campaign_submissions",
        },
        async (payload) => {
          const newJoin = payload.new as {
            id: string;
            submitted_at: string;
            platform?: string;
            campaign_id: string;
            creator_id?: string;
          };

          let campaignName = "Campaign";
          let campaignSlug: string | undefined;
          let brandLogoUrl: string | undefined;
          let isPrivate = false;
          let username: string | undefined;

          const { data: campaign } = await supabase
            .from("campaigns")
            .select("title, slug, brand_logo_url")
            .eq("id", newJoin.campaign_id)
            .single();
          if (campaign) {
            campaignName = campaign.title;
            campaignSlug = campaign.slug || undefined;
            brandLogoUrl = campaign.brand_logo_url || undefined;
          }

          if (newJoin.creator_id) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("username, is_private")
              .eq("id", newJoin.creator_id)
              .single();
            if (profile) {
              isPrivate = profile.is_private || false;
              username = profile.username || undefined;
            }
          }

          const newActivity: ActivityItem = {
            id: newJoin.id,
            type: "join",
            description: "Joined campaign",
            created_at: newJoin.submitted_at,
            username,
            platform: newJoin.platform,
            campaign_name: campaignName,
            campaign_slug: campaignSlug,
            brand_logo_url: brandLogoUrl,
            is_private: isPrivate,
          };
          setActivities((prev) => [newActivity, ...prev.slice(0, 9)]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const formatUsername = (username?: string, isPrivate?: boolean) => {
    if (!username) return "Creator";
    if (!isPrivate) return username;
    // Only anonymize if privacy is on
    if (username.length <= 4) return username.charAt(0) + "***";
    return username.slice(0, 3) + "***" + username.slice(-2);
  };

  const getPlatformColor = (platform?: string) => {
    switch (platform) {
      case "tiktok":
        return "bg-pink-500";
      case "instagram":
        return "bg-gradient-to-br from-purple-500 to-orange-400";
      case "youtube":
        return "bg-red-500";
      default:
        return "bg-primary";
    }
  };

  const truncateCampaignName = (name: string, maxLength = 18) => {
    if (name.length <= maxLength) return name;
    return name.slice(0, maxLength) + "...";
  };

  if (loading) {
    return (
      <div className="mt-8 space-y-3">
        <h3 className="text-sm font-semibold text-foreground tracking-[-0.3px] font-['Geist',sans-serif]">
          Recent Activity
        </h3>
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-muted/30 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (activities.length === 0) return null;

  return (
    <div className="mt-8 space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-foreground tracking-[-0.3px] font-['Geist',sans-serif]">
          Recent Activity
        </h3>
      </div>

      <div className="bg-card/50 rounded-xl border border-border/50 overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-4 gap-4 px-4 py-2.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider border-b border-border/50 bg-muted/20">
          <span>Creator</span>
          <span>Time</span>
          <span>Campaign</span>
          <span className="text-right">Action</span>
        </div>

        {/* Rows */}
        <div className="divide-y divide-border/30">
          {activities.map((activity, index) => (
            <div
              key={activity.id}
              className={`grid grid-cols-4 gap-4 px-4 py-3 text-xs items-center transition-colors hover:bg-muted/20 ${
                index % 2 === 0 ? "bg-transparent" : "bg-muted/10"
              }`}
            >
              {/* Creator */}
              <div className="flex items-center gap-2">
                <div
                  className={`w-5 h-5 rounded-full ${getPlatformColor(activity.platform)} flex items-center justify-center`}
                >
                  <span className="text-[8px] font-bold text-white">
                    {activity.platform?.charAt(0).toUpperCase() || "?"}
                  </span>
                </div>
                <span className="font-medium text-foreground truncate tracking-[-0.3px] font-['Geist',sans-serif]">
                  {formatUsername(activity.username, activity.is_private)}
                </span>
              </div>

              {/* Time */}
              <span className="text-muted-foreground tracking-[-0.3px] font-['Geist',sans-serif]">
                {formatDistanceToNow(new Date(activity.created_at), {
                  addSuffix: false,
                })}
              </span>

              {/* Campaign with brand logo */}
              <div className="flex items-center gap-1.5 min-w-0">
                {activity.brand_logo_url && (
                  <div className="w-4 h-4 rounded-full overflow-hidden flex-shrink-0">
                    <OptimizedImage
                      src={activity.brand_logo_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <button
                  onClick={() => activity.campaign_slug && navigate(`/c/${activity.campaign_slug}`)}
                  className="text-foreground truncate tracking-[-0.3px] font-['Geist',sans-serif] hover:underline cursor-pointer bg-transparent border-none p-0 text-left text-xs"
                  title={activity.campaign_name}
                >
                  {truncateCampaignName(activity.campaign_name || "Campaign")}
                </button>
              </div>

              {/* Action */}
              <div className="flex items-center justify-end gap-1">
                {activity.type === "earning" ? (
                  <>
                    <span className="font-semibold text-emerald-500 tracking-[-0.3px] font-['Geist',sans-serif]">
                      Earned ${activity.amount?.toFixed(2)}
                    </span>
                    <div className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <DollarSign className="w-2.5 h-2.5 text-emerald-500" />
                    </div>
                  </>
                ) : (
                  <>
                    <span className="font-semibold text-blue-500 tracking-[-0.3px] font-['Geist',sans-serif]">
                      Joined campaign
                    </span>
                    <div className="w-4 h-4 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <UserPlus className="w-2.5 h-2.5 text-blue-500" />
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
