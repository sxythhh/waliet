import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { DollarSign } from "lucide-react";
import { OptimizedImage } from "@/components/OptimizedImage";
import { useNavigate } from "react-router-dom";
interface ActivityItem {
  id: string;
  amount: number;
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
      const {
        data: earnings
      } = await supabase.from("wallet_transactions").select("id, amount, type, description, created_at, metadata, user_id").eq("type", "earning").gt("amount", 0).order("created_at", {
        ascending: false
      }).limit(10);
      if (!earnings || earnings.length === 0) {
        setActivities([]);
        setLoading(false);
        return;
      }

      // Collect unique campaign IDs and user IDs for batch fetching
      const campaignIds = new Set<string>();
      const userIds = new Set<string>();
      earnings.forEach(earning => {
        const metadata = earning.metadata as {
          campaign_id?: string;
        } || {};
        if (metadata.campaign_id) campaignIds.add(metadata.campaign_id);
        if (earning.user_id) userIds.add(earning.user_id);
      });

      // Batch fetch campaigns and profiles in parallel
      const [campaignsResult, profilesResult] = await Promise.all([campaignIds.size > 0 ? supabase.from("campaigns").select("id, title, slug, brand_logo_url").in("id", Array.from(campaignIds)) : Promise.resolve({
        data: []
      }), userIds.size > 0 ? supabase.from("profiles").select("id, is_private").in("id", Array.from(userIds)) : Promise.resolve({
        data: []
      })]);

      // Create lookup maps
      const campaignMap = new Map<string, {
        title: string;
        slug: string | null;
        brand_logo_url: string | null;
      }>();
      (campaignsResult.data || []).forEach(c => campaignMap.set(c.id, c));
      const profileMap = new Map<string, {
        is_private: boolean | null;
      }>();
      (profilesResult.data || []).forEach(p => profileMap.set(p.id, p));

      // Format activities using the maps
      const formattedActivities: ActivityItem[] = earnings.map(earning => {
        const metadata = earning.metadata as {
          account_username?: string;
          platform?: string;
          campaign_id?: string;
        } || {};
        const campaign = metadata.campaign_id ? campaignMap.get(metadata.campaign_id) : null;
        const profile = earning.user_id ? profileMap.get(earning.user_id) : null;
        return {
          id: earning.id,
          amount: earning.amount,
          description: earning.description,
          created_at: earning.created_at,
          username: metadata.account_username,
          platform: metadata.platform,
          campaign_name: campaign?.title || "Campaign",
          campaign_slug: campaign?.slug || undefined,
          brand_logo_url: campaign?.brand_logo_url || undefined,
          is_private: profile?.is_private || false
        };
      });
      setActivities(formattedActivities);
      setLoading(false);
    };
    fetchActivities();

    // Set up realtime subscription for earnings
    const channel = supabase.channel("recent-activity").on("postgres_changes", {
      event: "INSERT",
      schema: "public",
      table: "wallet_transactions"
    }, async payload => {
      const newTransaction = payload.new as {
        id: string;
        type: string;
        amount: number;
        description: string;
        created_at: string;
        user_id?: string;
        metadata: {
          account_username?: string;
          platform?: string;
          campaign_id?: string;
        } | null;
      };
      if (newTransaction.type === "earning" && newTransaction.amount > 0) {
        const metadata = newTransaction.metadata || {};
        let campaignName = "Campaign";
        let campaignSlug: string | undefined;
        let brandLogoUrl: string | undefined;
        let isPrivate = false;
        if (metadata.campaign_id) {
          const {
            data: campaign
          } = await supabase.from("campaigns").select("title, slug, brand_logo_url").eq("id", metadata.campaign_id).single();
          if (campaign) {
            campaignName = campaign.title;
            campaignSlug = campaign.slug || undefined;
            brandLogoUrl = campaign.brand_logo_url || undefined;
          }
        }
        if (newTransaction.user_id) {
          const {
            data: profile
          } = await supabase.from("profiles").select("is_private").eq("id", newTransaction.user_id).single();
          if (profile) {
            isPrivate = profile.is_private || false;
          }
        }
        const newActivity: ActivityItem = {
          id: newTransaction.id,
          amount: newTransaction.amount,
          description: newTransaction.description,
          created_at: newTransaction.created_at,
          username: metadata.account_username,
          platform: metadata.platform,
          campaign_name: campaignName,
          campaign_slug: campaignSlug,
          brand_logo_url: brandLogoUrl,
          is_private: isPrivate
        };
        setActivities(prev => [newActivity, ...prev.slice(0, 9)]);
      }
    }).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  const formatUsername = (username?: string, isPrivate?: boolean) => {
    if (!username) return "Creator";
    if (!isPrivate) return username;
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
    return <div className="mt-8 space-y-3">
        <h3 className="text-sm font-semibold text-foreground tracking-[-0.3px] font-['Geist',sans-serif]">
          Recent Transactions
        </h3>
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-muted/30 rounded-lg animate-pulse" />)}
        </div>
      </div>;
  }
  if (activities.length === 0) return null;
  return <div className="mt-8 space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="font-semibold text-foreground tracking-[-0.3px] font-['Geist',sans-serif] text-lg">
          Activity
        </h3>
      </div>

      <div className="bg-card/50 rounded-xl border border-border/50 overflow-hidden" style={{ fontFamily: 'Inter, sans-serif', letterSpacing: 'normal' }}>
        {/* Header */}
        <div className="grid grid-cols-4 gap-4 px-4 py-2.5 text-[10px] font-medium text-muted-foreground border-b border-border/50 bg-muted/20" style={{ fontFamily: 'Inter, sans-serif', letterSpacing: 'normal', textTransform: 'none' }}>
          <span>Creator</span>
          <span>Time</span>
          <span>Campaign</span>
          <span className="text-right">Earned</span>
        </div>

        {/* Rows */}
        <div className="divide-y divide-border/30">
          {activities.map((activity, index) => <div key={activity.id} className={`grid grid-cols-4 gap-4 px-4 py-3 text-xs items-center transition-colors hover:bg-muted/20 ${index % 2 === 0 ? "bg-transparent" : "bg-muted/10"}`}>
              {/* Creator */}
              <div className="flex items-center">
                <span className="font-medium text-foreground truncate">
                  {formatUsername(activity.username, activity.is_private)}
                </span>
              </div>

              {/* Time */}
              <span className="text-muted-foreground">
                {formatDistanceToNow(new Date(activity.created_at), {
              addSuffix: true
            }).replace(/^about /, '')}
              </span>

              {/* Campaign with brand logo */}
              <div className="flex items-center gap-1.5 min-w-0">
                {activity.brand_logo_url && <div className="w-4 h-4 rounded-full overflow-hidden flex-shrink-0">
                    <OptimizedImage src={activity.brand_logo_url} alt="" className="w-full h-full object-cover" />
                  </div>}
                <button onClick={() => activity.campaign_slug && navigate(`/c/${activity.campaign_slug}`)} className="text-foreground truncate hover:underline cursor-pointer bg-transparent border-none p-0 text-left text-xs" title={activity.campaign_name}>
                  {truncateCampaignName(activity.campaign_name || "Campaign")}
                </button>
              </div>

              {/* Earned */}
              <div className="flex items-center justify-end gap-1">
                <span className="font-semibold text-emerald-500">
                  ${activity.amount?.toFixed(2)}
                </span>
                
              </div>
            </div>)}
        </div>
      </div>
    </div>;
}