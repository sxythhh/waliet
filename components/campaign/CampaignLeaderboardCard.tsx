import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface LeaderboardEntry {
  rank: number;
  username: string;
  avatar_url?: string;
  earnings: number;
  user_id: string;
  is_current_user: boolean;
}

interface CampaignLeaderboardCardProps {
  campaignId: string;
  className?: string;
}

export function CampaignLeaderboardCard({ campaignId, className }: CampaignLeaderboardCardProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [currentUserRank, setCurrentUserRank] = useState<LeaderboardEntry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      const currentUserId = user?.id;

      // Fetch earnings for this campaign from wallet_transactions
      // Filter by metadata->>'source_id' matching the campaign
      const { data: transactions } = await supabase
        .from("wallet_transactions")
        .select("user_id, amount, metadata")
        .eq("type", "earning")
        .gt("amount", 0);

      if (!transactions) {
        setLoading(false);
        return;
      }

      // Filter transactions for this specific campaign
      const campaignTransactions = transactions.filter(t => {
        const metadata = t.metadata as Record<string, unknown> | null;
        return metadata?.source_id === campaignId || metadata?.campaign_id === campaignId;
      });

      // Aggregate earnings by user
      const earningsByUser = new Map<string, number>();
      campaignTransactions.forEach((t) => {
        const current = earningsByUser.get(t.user_id) || 0;
        earningsByUser.set(t.user_id, current + t.amount);
      });

      // Sort and get top 5
      const sortedEarners = Array.from(earningsByUser.entries())
        .sort((a, b) => b[1] - a[1]);

      const topEarners = sortedEarners.slice(0, 5);

      // Find current user's rank if not in top 5
      let userRankEntry: LeaderboardEntry | null = null;
      if (currentUserId) {
        const userIndex = sortedEarners.findIndex(([userId]) => userId === currentUserId);
        if (userIndex >= 5) {
          const [, earnings] = sortedEarners[userIndex];
          userRankEntry = {
            rank: userIndex + 1,
            username: "You",
            earnings,
            user_id: currentUserId,
            is_current_user: true
          };
        }
      }

      // Fetch profiles for top earners
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

      // Format leaderboard entries
      const formattedLeaderboard: LeaderboardEntry[] = topEarners.map(
        ([userId, earnings], index) => {
          const profile = profileMap.get(userId);
          const isPrivate = profile?.is_private || false;
          const isCurrentUser = userId === currentUserId;
          return {
            rank: index + 1,
            username: isCurrentUser ? "You" : (isPrivate ? "Private" : (profile?.username || "Creator")),
            avatar_url: isPrivate ? undefined : (profile?.avatar_url || undefined),
            earnings,
            user_id: userId,
            is_current_user: isCurrentUser,
          };
        }
      );

      setLeaderboard(formattedLeaderboard);
      setCurrentUserRank(userRankEntry);
      setLoading(false);
    };

    fetchLeaderboard();
  }, [campaignId]);

  const formatEarnings = (value: number) => {
    if (value >= 1000) return "$" + (value / 1000).toFixed(1) + "K";
    return "$" + value.toFixed(0);
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return "bg-amber-500 text-white";
    if (rank === 2) return "bg-gray-400 text-white";
    if (rank === 3) return "bg-amber-700 text-white";
    return "bg-muted text-muted-foreground";
  };

  if (loading) {
    return (
      <div className={`rounded-2xl bg-card border border-border p-4 ${className || ""}`}>
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="w-5 h-5 rounded" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="w-6 h-6 rounded-full" />
              <Skeleton className="w-8 h-8 rounded-full" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-12" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <div className={`rounded-2xl bg-card border border-border p-4 ${className || ""}`}>
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-4 h-4 text-amber-500" />
          <h3 className="text-sm font-semibold" style={{ fontFamily: 'Inter', letterSpacing: '-0.5px' }}>
            Top Earners
          </h3>
        </div>
        <p className="text-xs text-muted-foreground text-center py-4">
          No earnings yet. Be the first!
        </p>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl bg-card border border-border p-4 ${className || ""}`}>
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="w-4 h-4 text-amber-500" />
        <h3 className="text-sm font-semibold" style={{ fontFamily: 'Inter', letterSpacing: '-0.5px' }}>
          Top Earners
        </h3>
      </div>

      <div className="space-y-2">
        {leaderboard.map((entry) => (
          <div
            key={entry.user_id}
            className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
              entry.is_current_user ? "bg-primary/10 border border-primary/20" : "hover:bg-muted/50"
            }`}
          >
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${getRankBadge(entry.rank)}`}>
              {entry.rank}
            </div>
            <Avatar className="w-7 h-7">
              <AvatarImage src={entry.avatar_url} />
              <AvatarFallback className="text-[10px]">
                {entry.username.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className={`text-sm flex-1 truncate ${entry.is_current_user ? "font-semibold" : ""}`} style={{ fontFamily: 'Inter', letterSpacing: '-0.3px' }}>
              {entry.username}
            </span>
            <span className="text-sm font-medium text-green-600 dark:text-green-400" style={{ fontFamily: 'Inter', letterSpacing: '-0.3px' }}>
              {formatEarnings(entry.earnings)}
            </span>
          </div>
        ))}

        {/* Show current user's rank if not in top 5 */}
        {currentUserRank && (
          <>
            <div className="flex items-center gap-2 py-1">
              <div className="flex-1 h-px bg-border" />
              <span className="text-[10px] text-muted-foreground">Your rank</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            <div className="flex items-center gap-3 p-2 rounded-lg bg-primary/10 border border-primary/20">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-muted text-muted-foreground">
                {currentUserRank.rank}
              </div>
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm flex-1 font-semibold" style={{ fontFamily: 'Inter', letterSpacing: '-0.3px' }}>
                You
              </span>
              <span className="text-sm font-medium text-green-600 dark:text-green-400" style={{ fontFamily: 'Inter', letterSpacing: '-0.3px' }}>
                {formatEarnings(currentUserRank.earnings)}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
