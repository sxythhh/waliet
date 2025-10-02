import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, TrendingUp, Award } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface LeaderboardEntry {
  rank: number;
  username: string;
  earnings: number;
  views: number;
  userId: string;
}

export function LeaderboardTab() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchLeaderboardData();
  }, []);

  const fetchLeaderboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);

      // Fetch all profiles ordered by total_earnings
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, username, total_earnings")
        .order("total_earnings", { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch total views for each user from campaign_submissions
      const { data: submissions, error: submissionsError } = await supabase
        .from("campaign_submissions")
        .select("creator_id, views");

      if (submissionsError) throw submissionsError;

      // Aggregate views by user
      const viewsByUser = submissions?.reduce((acc, sub) => {
        acc[sub.creator_id] = (acc[sub.creator_id] || 0) + (sub.views || 0);
        return acc;
      }, {} as Record<string, number>) || {};

      // Create leaderboard with ranks
      const leaderboardData: LeaderboardEntry[] = profiles?.map((profile, index) => ({
        rank: index + 1,
        username: profile.username,
        earnings: Number(profile.total_earnings) || 0,
        views: viewsByUser[profile.id] || 0,
        userId: profile.id,
      })) || [];

      setLeaderboard(leaderboardData);

      // Find current user's rank
      if (user?.id) {
        const userEntry = leaderboardData.find(entry => entry.userId === user.id);
        setUserRank(userEntry?.rank || null);
      }
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
    } finally {
      setLoading(false);
    }
  };
  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "text-warning";
      case 2:
        return "text-muted-foreground";
      case 3:
        return "text-destructive";
      default:
        return "text-foreground";
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-6 w-6 text-warning" />;
      case 2:
        return <Award className="h-6 w-6 text-muted-foreground" />;
      case 3:
        return <Award className="h-6 w-6 text-destructive" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="space-y-8 max-w-5xl mx-auto">
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const topThree = leaderboard.slice(0, 3);

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Top 3 Podium */}
      {topThree.length >= 3 && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          {/* 2nd Place */}
          <Card className="bg-gradient-card border-0 mt-8">
            <CardHeader className="text-center pb-2">
              <div className="flex justify-center mb-2">
                <Award className="h-12 w-12 text-muted-foreground" />
              </div>
              <CardTitle className="text-lg">#2</CardTitle>
              <p className="text-sm font-medium">@{topThree[1].username}</p>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-2xl font-bold text-success">${topThree[1].earnings.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">{(topThree[1].views / 1000000).toFixed(1)}M views</p>
            </CardContent>
          </Card>

          {/* 1st Place */}
          <Card className="bg-gradient-card border-0">
            <CardHeader className="text-center pb-2">
              <div className="flex justify-center mb-2">
                <Trophy className="h-16 w-16 text-warning" />
              </div>
              <CardTitle className="text-xl">#1</CardTitle>
              <p className="text-sm font-medium">@{topThree[0].username}</p>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-3xl font-bold text-warning">${topThree[0].earnings.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">{(topThree[0].views / 1000000).toFixed(1)}M views</p>
            </CardContent>
          </Card>

          {/* 3rd Place */}
          <Card className="bg-gradient-card border-0 mt-8">
            <CardHeader className="text-center pb-2">
              <div className="flex justify-center mb-2">
                <Award className="h-12 w-12 text-destructive" />
              </div>
              <CardTitle className="text-lg">#3</CardTitle>
              <p className="text-sm font-medium">@{topThree[2].username}</p>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-2xl font-bold text-success">${topThree[2].earnings.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">{(topThree[2].views / 1000000).toFixed(1)}M views</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Full Leaderboard */}
      <Card className="bg-gradient-card border-0">
        <CardHeader>
          <CardTitle>Rankings</CardTitle>
          <CardDescription>All-time top performers</CardDescription>
        </CardHeader>
        <CardContent>
          {leaderboard.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No leaderboard data available yet</p>
          ) : (
            <div className="space-y-4">
              {leaderboard.map((creator) => (
                <div
                  key={creator.userId}
                  className={`flex items-center justify-between p-4 rounded-lg border-0 hover:bg-muted/50 transition-colors ${
                    creator.userId === currentUserId ? 'bg-primary/10 border border-primary/20' : ''
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`text-2xl font-bold ${getRankColor(creator.rank)} min-w-[3rem] flex items-center justify-center`}>
                      {creator.rank <= 3 ? getRankIcon(creator.rank) : `#${creator.rank}`}
                    </div>
                    <div>
                      <p className="font-medium">@{creator.username}</p>
                      <p className="text-sm text-muted-foreground">{(creator.views / 1000000).toFixed(1)}M total views</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-success">${creator.earnings.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">earned</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Your Rank */}
      {userRank && (
        <Card className="bg-gradient-card border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Your Rank
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">#{userRank}</p>
                <p className="text-sm text-muted-foreground">
                  {userRank <= 10 ? "Outstanding performance!" : "Keep creating to climb higher!"}
                </p>
              </div>
              <Badge className="bg-primary/20 text-primary text-lg px-4 py-2">
                {userRank === 1 ? "Champion" : userRank <= 3 ? "Top 3" : userRank <= 10 ? "Top 10" : "Rising Star"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
