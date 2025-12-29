import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, BarChart3, Eye } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface LeaderboardEntry {
  rank: number;
  username: string;
  avatar_url?: string;
  value: number;
  user_id: string;
}

interface LeaderboardProps {
  className?: string;
}

export function Leaderboard({ className }: LeaderboardProps) {
  const [timeframe, setTimeframe] = useState<"weekly" | "monthly" | "all">("weekly");
  const [earningsLeaderboard, setEarningsLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [viewsLeaderboard, setViewsLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboards = async () => {
      setLoading(true);
      
      // Calculate date filter based on timeframe
      let dateFilter: string | null = null;
      const now = new Date();
      if (timeframe === "weekly") {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        dateFilter = weekAgo.toISOString();
      } else if (timeframe === "monthly") {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        dateFilter = monthAgo.toISOString();
      }

      // Fetch earnings leaderboard
      let earningsQuery = supabase
        .from("wallet_transactions")
        .select("user_id, amount")
        .eq("type", "earning")
        .gt("amount", 0);

      if (dateFilter) {
        earningsQuery = earningsQuery.gte("created_at", dateFilter);
      }

      const { data: earnings } = await earningsQuery;

      // Aggregate earnings by user
      const earningsByUser = new Map<string, number>();
      (earnings || []).forEach((e) => {
        const current = earningsByUser.get(e.user_id) || 0;
        earningsByUser.set(e.user_id, current + e.amount);
      });

      // Get top 10 earners
      const topEarners = Array.from(earningsByUser.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      // Fetch user profiles for top earners
      const userIds = topEarners.map(([userId]) => userId);
      const { data: profiles } = userIds.length > 0
        ? await supabase
            .from("profiles")
            .select("id, username, avatar_url, is_private")
            .in("id", userIds)
        : { data: [] };

      const profileMap = new Map(
        (profiles || []).map((p) => [p.id, p])
      );

      const formattedEarnings: LeaderboardEntry[] = topEarners.map(
        ([userId, amount], index) => {
          const profile = profileMap.get(userId);
          return {
            rank: index + 1,
            username: profile?.is_private 
              ? (profile?.username?.slice(0, 3) + "***" || "Creator")
              : (profile?.username || "Creator"),
            avatar_url: profile?.avatar_url || undefined,
            value: amount,
            user_id: userId,
          };
        }
      );

      setEarningsLeaderboard(formattedEarnings);

      // Fetch views leaderboard from video submissions
      let viewsQuery = supabase
        .from("video_submissions")
        .select("creator_id, views")
        .not("views", "is", null);

      if (dateFilter) {
        viewsQuery = viewsQuery.gte("created_at", dateFilter);
      }

      const { data: videos } = await viewsQuery;

      // Aggregate views by user
      const viewsByUser = new Map<string, number>();
      (videos || []).forEach((v) => {
        const current = viewsByUser.get(v.creator_id) || 0;
        viewsByUser.set(v.creator_id, current + (v.views || 0));
      });

      // Get top 10 by views
      const topViewers = Array.from(viewsByUser.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      // Fetch additional profiles if needed
      const viewerUserIds = topViewers.map(([userId]) => userId);
      const newUserIds = viewerUserIds.filter((id) => !profileMap.has(id));
      
      if (newUserIds.length > 0) {
        const { data: newProfiles } = await supabase
          .from("profiles")
          .select("id, username, avatar_url, is_private")
          .in("id", newUserIds);
        (newProfiles || []).forEach((p) => profileMap.set(p.id, p));
      }

      const formattedViews: LeaderboardEntry[] = topViewers.map(
        ([userId, views], index) => {
          const profile = profileMap.get(userId);
          return {
            rank: index + 1,
            username: profile?.is_private 
              ? (profile?.username?.slice(0, 3) + "***" || "Creator")
              : (profile?.username || "Creator"),
            avatar_url: profile?.avatar_url || undefined,
            value: views,
            user_id: userId,
          };
        }
      );

      setViewsLeaderboard(formattedViews);
      setLoading(false);
    };

    fetchLeaderboards();
  }, [timeframe]);

  const formatValue = (value: number, type: "currency" | "number") => {
    if (type === "currency") {
      if (value >= 1000000) return "$" + (value / 1000000).toFixed(1) + "M";
      if (value >= 1000) return "$" + (value / 1000).toFixed(1) + "K";
      return "$" + value.toFixed(0);
    }
    if (value >= 1000000) return (value / 1000000).toFixed(1) + "M";
    if (value >= 1000) return (value / 1000).toFixed(0) + "K";
    return value.toLocaleString();
  };

  const getRankColor = (rank: number) => {
    if (rank <= 3) return "text-emerald-500";
    if (rank <= 10) return "text-emerald-500/70";
    return "text-muted-foreground";
  };

  const LeaderboardColumn = ({
    title,
    icon: Icon,
    data,
    valueType,
  }: {
    title: string;
    icon: typeof DollarSign;
    data: LeaderboardEntry[];
    valueType: "currency" | "number";
  }) => (
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-muted-foreground" />
          <h4 className="font-semibold text-foreground text-sm font-inter tracking-[-0.3px]">
            {title}
          </h4>
        </div>
      </div>

      <div className="space-y-2">
        {loading ? (
          [...Array(5)].map((_, i) => (
            <div key={i} className="h-10 bg-muted/30 rounded-lg animate-pulse" />
          ))
        ) : data.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">
            No data yet
          </p>
        ) : (
          data.map((entry) => (
            <div
              key={entry.user_id}
              className="flex items-center gap-3 py-2 px-1"
            >
              <span
                className={`w-6 text-xs font-semibold ${getRankColor(entry.rank)}`}
              >
                {entry.rank}
              </span>
              <Avatar className="w-7 h-7">
                <AvatarImage src={entry.avatar_url} alt={entry.username} />
                <AvatarFallback className="text-[10px] bg-muted">
                  {entry.username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="flex-1 text-sm text-foreground truncate font-inter tracking-[-0.3px]">
                {entry.username}
              </span>
              <span className="text-sm font-medium text-foreground font-inter tracking-[-0.3px]">
                {formatValue(entry.value, valueType)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className={className}>
      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        <Select value={timeframe} onValueChange={(v) => setTimeframe(v as typeof timeframe)}>
          <SelectTrigger className="w-[120px] h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="all">All time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Leaderboard Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-card/50 rounded-xl border border-border/50 p-5">
        <LeaderboardColumn
          title="Earnings"
          icon={DollarSign}
          data={earningsLeaderboard}
          valueType="currency"
        />
        <LeaderboardColumn
          title="Views"
          icon={Eye}
          data={viewsLeaderboard}
          valueType="number"
        />
      </div>
    </div>
  );
}
