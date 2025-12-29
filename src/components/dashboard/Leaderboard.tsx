import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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
  const navigate = useNavigate();
  const [timeframe, setTimeframe] = useState<"weekly" | "monthly" | "all">("weekly");
  const [earningsLeaderboard, setEarningsLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [rankLeaderboard, setRankLeaderboard] = useState<LeaderboardEntry[]>([]);
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

      // Fetch earnings leaderboard - need to fetch all records to aggregate properly
      let allEarnings: { user_id: string; amount: number }[] = [];
      let offset = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        let earningsQuery = supabase
          .from("wallet_transactions")
          .select("user_id, amount")
          .eq("type", "earning")
          .gt("amount", 0)
          .range(offset, offset + pageSize - 1);

        if (dateFilter) {
          earningsQuery = earningsQuery.gte("created_at", dateFilter);
        }

        const { data: earnings } = await earningsQuery;
        
        if (earnings && earnings.length > 0) {
          allEarnings = [...allEarnings, ...earnings];
          offset += pageSize;
          hasMore = earnings.length === pageSize;
        } else {
          hasMore = false;
        }
      }

      // Aggregate earnings by user
      const earningsByUser = new Map<string, number>();
      allEarnings.forEach((e) => {
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
            .from("public_profiles")
            .select("id, username, avatar_url")
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
            username: profile?.username || "Creator",
            avatar_url: profile?.avatar_url || undefined,
            value: amount,
            user_id: userId,
          };
        }
      );

      setEarningsLeaderboard(formattedEarnings);

      // Fetch rank leaderboard - top users by level
      const { data: topLevelUsers } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, is_private, current_level")
        .not("current_level", "is", null)
        .order("current_level", { ascending: false })
        .limit(10);

      const formattedRanks: LeaderboardEntry[] = (topLevelUsers || []).map(
        (profile, index) => ({
          rank: index + 1,
          username: profile.is_private 
            ? (profile.username?.slice(0, 3) + "***" || "Creator")
            : (profile.username || "Creator"),
          avatar_url: profile.avatar_url || undefined,
          value: profile.current_level || 0,
          user_id: profile.id,
        })
      );

      setRankLeaderboard(formattedRanks);
      setLoading(false);
    };

    fetchLeaderboards();
  }, [timeframe]);

  const formatValue = (value: number, type: "currency" | "level") => {
    if (type === "currency") {
      if (value >= 1000000) return "$" + (value / 1000000).toFixed(1) + "M";
      if (value >= 1000) return "$" + (value / 1000).toFixed(1) + "K";
      return "$" + value.toFixed(0);
    }
    return "Lvl " + value;
  };

  const getRankStyle = (rank: number) => {
    if (rank === 1) return "w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center";
    if (rank === 2) return "w-6 h-6 rounded-full bg-slate-400 text-white flex items-center justify-center";
    if (rank === 3) return "w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center";
    return "w-6 text-muted-foreground text-center";
  };

  const LeaderboardColumn = ({
    title,
    data,
    valueType,
  }: {
    title: string;
    data: LeaderboardEntry[];
    valueType: "currency" | "level";
  }) => (
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold text-foreground text-sm font-inter tracking-[-0.3px]">
          {title}
        </h4>
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
              onClick={() => navigate(`/@${entry.username}`)}
              className="flex items-center gap-3 py-2 px-2 rounded-lg cursor-pointer transition-colors hover:bg-muted/50"
            >
              <span
                className={`text-xs font-semibold ${getRankStyle(entry.rank)}`}
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
          <SelectTrigger className="w-[120px] h-9 text-sm border-border/50 dark:border-transparent dark:bg-muted/30 dark:data-[state=open]:bg-muted/50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="dark:bg-[#1a1a1a] dark:border-transparent">
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
          data={earningsLeaderboard}
          valueType="currency"
        />
        <LeaderboardColumn
          title="Rank"
          data={rankLeaderboard}
          valueType="level"
        />
      </div>
    </div>
  );
}
