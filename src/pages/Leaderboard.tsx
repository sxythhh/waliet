import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Trophy, Medal, Award } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface LeaderboardUser {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  total_earnings: number;
  rank: number;
}

type TimePeriod = 'week' | 'month' | 'all';

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('week');
  const [searchQuery, setSearchQuery] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserStats, setCurrentUserStats] = useState<LeaderboardUser | null>(null);

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUserId) {
      fetchLeaderboard();
    }
  }, [timePeriod, currentUserId]);

  const fetchCurrentUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      setCurrentUserId(session.user.id);
    }
  };

  const fetchLeaderboard = async () => {
    setLoading(true);
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Calculate date range based on period
    let dateFilter = '';
    const now = new Date();
    
    if (timePeriod === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      dateFilter = weekAgo.toISOString();
    } else if (timePeriod === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      dateFilter = monthAgo.toISOString();
    }

    // Fetch wallet transactions for the time period
    let query = supabase
      .from("wallet_transactions")
      .select("user_id, amount");

    if (dateFilter) {
      query = query.gte("created_at", dateFilter);
    }

    query = query.eq("type", "earning");

    const { data: transactions } = await query;

    // Group by user and sum earnings
    const userEarnings = new Map<string, number>();
    transactions?.forEach((txn) => {
      const current = userEarnings.get(txn.user_id) || 0;
      userEarnings.set(txn.user_id, current + Number(txn.amount));
    });

    // Fetch profile data for users with earnings
    const userIds = Array.from(userEarnings.keys());
    if (userIds.length === 0) {
      setLeaderboard([]);
      setLoading(false);
      return;
    }

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, full_name, avatar_url")
      .in("id", userIds);

    // Combine and sort
    const leaderboardData: LeaderboardUser[] = profiles?.map((profile) => ({
      id: profile.id,
      username: profile.username || "Anonymous",
      full_name: profile.full_name,
      avatar_url: profile.avatar_url,
      total_earnings: userEarnings.get(profile.id) || 0,
      rank: 0
    })) || [];

    leaderboardData.sort((a, b) => b.total_earnings - a.total_earnings);
    
    // Assign ranks
    leaderboardData.forEach((user, index) => {
      user.rank = index + 1;
    });

    // Find current user in full leaderboard
    const currentUser = leaderboardData.find(u => u.id === currentUserId);
    if (currentUser) {
      // If user is in top 20, show their actual rank
      // If not, we'll show "-"
      setCurrentUserStats(currentUser.rank <= 20 ? currentUser : {
        ...currentUser,
        rank: -1 // Special value to indicate outside top 20
      });
    } else {
      // User has no earnings in this period
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url")
        .eq("id", currentUserId)
        .single();
      
      if (profile) {
        setCurrentUserStats({
          id: profile.id,
          username: profile.username || "You",
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
          total_earnings: 0,
          rank: -1
        });
      }
    }

    setLeaderboard(leaderboardData.slice(0, 20)); // Only show top 20
    setLoading(false);
  };

  const filteredLeaderboard = leaderboard.filter((user) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      user.username.toLowerCase().includes(query) ||
      user.full_name?.toLowerCase().includes(query)
    );
  });

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
    if (rank === 3) return <Award className="h-5 w-5 text-amber-600" />;
    return null;
  };

  const getRankBadgeColor = (rank: number) => {
    if (rank === 1) return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
    if (rank === 2) return "bg-gray-400/10 text-gray-400 border-gray-400/20";
    if (rank === 3) return "bg-amber-600/10 text-amber-600 border-amber-600/20";
    return "bg-muted/50 text-muted-foreground border-border";
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Leaderboard</h1>
          <p className="text-muted-foreground">Top earning creators on the platform</p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between bg-muted/30 p-3 rounded-lg">
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={timePeriod === 'week' ? 'default' : 'secondary'}
              onClick={() => setTimePeriod('week')}
              size="sm"
              className="h-8 px-3"
            >
              Week
            </Button>
            <Button
              variant={timePeriod === 'month' ? 'default' : 'secondary'}
              onClick={() => setTimePeriod('month')}
              size="sm"
              className="h-8 px-3"
            >
              Month
            </Button>
            <Button
              variant={timePeriod === 'all' ? 'default' : 'secondary'}
              onClick={() => setTimePeriod('all')}
              size="sm"
              className="h-8 px-3"
            >
              All Time
            </Button>
          </div>

          <div className="relative w-full sm:w-52">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search by name"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-sm bg-background border-border"
            />
          </div>
        </div>

        {/* Leaderboard Table */}
        <Card className="border-0 bg-card">
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">Rankings</CardTitle>
              <div className="flex gap-8 text-sm font-medium">
                <span className="text-muted-foreground">Earnings</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="space-y-4 p-4">
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-24 ml-auto" />
                  </div>
                ))}
              </div>
            ) : filteredLeaderboard.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No data available for this period</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredLeaderboard.map((user) => (
                  <div
                    key={user.id}
                    className={`flex items-center gap-4 p-4 transition-colors ${
                      user.id === currentUserId ? 'bg-primary/5' : ''
                    }`}
                  >
                    {/* Rank */}
                    <div className="w-12 flex items-center justify-center">
                      {getRankIcon(user.rank) || (
                        <span className="text-sm font-medium text-muted-foreground">
                          {user.rank}
                        </span>
                      )}
                    </div>

                    {/* Avatar and Name */}
                    <Avatar className="h-12 w-12 border-2 border-border">
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback className="bg-muted">
                        {user.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold truncate">
                          {user.full_name || user.username}
                        </p>
                        {user.id === currentUserId && (
                          <Badge variant="outline" className="text-xs">You</Badge>
                        )}
                      </div>
                      {user.full_name && (
                        <p className="text-sm text-muted-foreground">@{user.username}</p>
                      )}
                    </div>

                    {/* Earnings */}
                    <div className="text-right">
                      <span className="text-lg font-bold text-green-500">
                        +${user.total_earnings.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Floating Current User Card */}
      {currentUserStats && (
        <div className="fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 z-50">
          <div className="container mx-auto px-4 py-3 max-w-5xl">
            <div className="bg-primary/5 border-2 border-primary/20 rounded-lg p-4">
              <div className="flex items-center gap-4">
                {/* Rank */}
                <div className="w-12 flex items-center justify-center">
                  {currentUserStats.rank === -1 ? (
                    <span className="text-lg font-bold text-muted-foreground">—</span>
                  ) : (
                    getRankIcon(currentUserStats.rank) || (
                      <span className="text-sm font-medium text-muted-foreground">
                        {currentUserStats.rank}
                      </span>
                    )
                  )}
                </div>

                {/* Avatar and Name */}
                <Avatar className="h-12 w-12 border-2 border-primary">
                  <AvatarImage src={currentUserStats.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {currentUserStats.username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold truncate">
                      {currentUserStats.full_name || currentUserStats.username}
                    </p>
                    <Badge variant="outline" className="text-xs bg-primary text-primary-foreground border-primary">
                      You
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {currentUserStats.rank === -1 
                      ? "Keep earning to reach the top 20!" 
                      : "Your ranking"}
                  </p>
                </div>

                {/* Earnings */}
                <div className="text-right">
                  <span className="text-lg font-bold text-green-500">
                    {currentUserStats.total_earnings > 0 ? '+' : ''}${currentUserStats.total_earnings.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
