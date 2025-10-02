import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, TrendingUp, Award } from "lucide-react";

const mockLeaderboard = [
  { rank: 1, username: "creator_mike", earnings: 15420, views: 2.4 },
  { rank: 2, username: "sarah_content", earnings: 12350, views: 1.9 },
  { rank: 3, username: "viralking99", earnings: 11200, views: 1.7 },
  { rank: 4, username: "content_queen", earnings: 9800, views: 1.5 },
  { rank: 5, username: "tiktok_pro", earnings: 8600, views: 1.3 },
];

export function LeaderboardTab() {
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

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Top 3 Podium */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {/* 2nd Place */}
        <Card className="bg-gradient-card border-0 mt-8">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-2">
              <Award className="h-12 w-12 text-muted-foreground" />
            </div>
            <CardTitle className="text-lg">#2</CardTitle>
            <p className="text-sm font-medium">@{mockLeaderboard[1].username}</p>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-2xl font-bold text-success">${mockLeaderboard[1].earnings.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{mockLeaderboard[1].views}M views</p>
          </CardContent>
        </Card>

        {/* 1st Place */}
        <Card className="bg-gradient-card border-0">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-2">
              <Trophy className="h-16 w-16 text-warning" />
            </div>
            <CardTitle className="text-xl">#1</CardTitle>
            <p className="text-sm font-medium">@{mockLeaderboard[0].username}</p>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-3xl font-bold text-warning">${mockLeaderboard[0].earnings.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{mockLeaderboard[0].views}M views</p>
          </CardContent>
        </Card>

        {/* 3rd Place */}
        <Card className="bg-gradient-card border-0 mt-8">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-2">
              <Award className="h-12 w-12 text-destructive" />
            </div>
            <CardTitle className="text-lg">#3</CardTitle>
            <p className="text-sm font-medium">@{mockLeaderboard[2].username}</p>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-2xl font-bold text-success">${mockLeaderboard[2].earnings.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{mockLeaderboard[2].views}M views</p>
          </CardContent>
        </Card>
      </div>

      {/* Full Leaderboard */}
      <Card className="bg-gradient-card border-0">
        <CardHeader>
          <CardTitle>Rankings</CardTitle>
          <CardDescription>This month's top performers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockLeaderboard.map((creator) => (
              <div
                key={creator.rank}
                className="flex items-center justify-between p-4 rounded-lg border-0 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={`text-2xl font-bold ${getRankColor(creator.rank)} min-w-[3rem] flex items-center justify-center`}>
                    {creator.rank <= 3 ? getRankIcon(creator.rank) : `#${creator.rank}`}
                  </div>
                  <div>
                    <p className="font-medium">@{creator.username}</p>
                    <p className="text-sm text-muted-foreground">{creator.views}M total views</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-success">${creator.earnings.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">earned</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Your Rank */}
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
              <p className="text-3xl font-bold">#247</p>
              <p className="text-sm text-muted-foreground">Keep creating to climb higher!</p>
            </div>
            <Badge className="bg-primary/20 text-primary text-lg px-4 py-2">
              Rising Star
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
