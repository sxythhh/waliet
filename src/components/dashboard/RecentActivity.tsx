import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { DollarSign, Eye } from "lucide-react";
interface ActivityItem {
  id: string;
  amount: number;
  type: string;
  description: string;
  created_at: string;
  metadata: {
    account_username?: string;
    platform?: string;
    views?: number;
    campaign_id?: string;
  } | null;
}
export function RecentActivity() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const fetchActivities = async () => {
      const {
        data,
        error
      } = await supabase.from("wallet_transactions").select("id, amount, type, description, created_at, metadata").eq("type", "earning").gt("amount", 0).order("created_at", {
        ascending: false
      }).limit(10);
      if (!error && data) {
        setActivities(data as ActivityItem[]);
      }
      setLoading(false);
    };
    fetchActivities();

    // Set up realtime subscription
    const channel = supabase.channel("recent-activity").on("postgres_changes", {
      event: "INSERT",
      schema: "public",
      table: "wallet_transactions"
    }, payload => {
      const newActivity = payload.new as ActivityItem;
      if (newActivity.type === "earning" && newActivity.amount > 0) {
        setActivities(prev => [newActivity, ...prev.slice(0, 9)]);
      }
    }).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  const formatUsername = (username?: string) => {
    if (!username) return "Creator";
    // Anonymize the username partially
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
  if (loading) {
    return <div className="mt-8 space-y-3">
        <h3 className="text-sm font-semibold text-foreground tracking-[-0.3px] font-['Geist',sans-serif]">
          Recent Activity
        </h3>
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-muted/30 rounded-lg animate-pulse" />)}
        </div>
      </div>;
  }
  if (activities.length === 0) return null;
  return <div className="mt-8 space-y-3">
      <div className="flex items-center gap-2">
        
        <h3 className="text-sm font-semibold text-foreground tracking-[-0.3px] font-['Geist',sans-serif]">
          Recent Earnings
        </h3>
      </div>

      <div className="bg-card/50 rounded-xl border border-border/50 overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-4 gap-4 px-4 py-2.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider border-b border-border/50 bg-muted/20">
          <span>Creator</span>
          <span>Time</span>
          <span className="text-right">Views</span>
          <span className="text-right">Payout</span>
        </div>

        {/* Rows */}
        <div className="divide-y divide-border/30">
          {activities.map((activity, index) => {
          const metadata = activity.metadata || {};
          return <div key={activity.id} className={`grid grid-cols-4 gap-4 px-4 py-3 text-xs items-center transition-colors hover:bg-muted/20 ${index % 2 === 0 ? "bg-transparent" : "bg-muted/10"}`}>
                {/* Creator */}
                <div className="flex items-center gap-2">
                  <div className={`w-5 h-5 rounded-full ${getPlatformColor(metadata.platform)} flex items-center justify-center`}>
                    <span className="text-[8px] font-bold text-white">
                      {metadata.platform?.charAt(0).toUpperCase() || "?"}
                    </span>
                  </div>
                  <span className="font-medium text-foreground truncate tracking-[-0.3px] font-['Geist',sans-serif]">
                    {formatUsername(metadata.account_username)}
                  </span>
                </div>

                {/* Time */}
                <span className="text-muted-foreground tracking-[-0.3px] font-['Geist',sans-serif]">
                  {formatDistanceToNow(new Date(activity.created_at), {
                addSuffix: false
              })}
                </span>

                {/* Views */}
                <div className="flex items-center justify-end gap-1 text-muted-foreground">
                  <Eye className="w-3 h-3" />
                  <span className="tracking-[-0.3px] font-['Geist',sans-serif]">
                    {metadata.views ? metadata.views >= 1000000 ? (metadata.views / 1000000).toFixed(1) + "M" : metadata.views >= 1000 ? (metadata.views / 1000).toFixed(1) + "K" : metadata.views.toString() : "-"}
                  </span>
                </div>

                {/* Payout */}
                <div className="flex items-center justify-end gap-1">
                  <span className="font-semibold text-emerald-500 tracking-[-0.3px] font-['Geist',sans-serif]">
                    +${activity.amount.toFixed(2)}
                  </span>
                  <div className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <DollarSign className="w-2.5 h-2.5 text-emerald-500" />
                  </div>
                </div>
              </div>;
        })}
        </div>
      </div>
    </div>;
}