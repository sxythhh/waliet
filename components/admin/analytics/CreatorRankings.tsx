import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sparklines, SparklinesLine } from "react-sparklines";
import { Medal, TrendingUp } from "lucide-react";

interface Creator {
  id: string;
  username: string;
  avatar_url: string | null;
  earnings: number;
  submissions: number;
  sparkline: number[];
}

interface CreatorRankingsProps {
  creators: Creator[];
}

export function CreatorRankings({ creators }: CreatorRankingsProps) {
  const formatCurrency = (value: number) => {
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
    return `$${value.toFixed(0)}`;
  };

  const getMedalColor = (index: number) => {
    switch (index) {
      case 0:
        return "text-yellow-500";
      case 1:
        return "text-gray-400";
      case 2:
        return "text-amber-600";
      default:
        return "text-muted-foreground/30";
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Medal className="h-4 w-4 text-yellow-500" />
          Top Performers
        </CardTitle>
      </CardHeader>
      <CardContent>
        {creators.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No creator data available
          </div>
        ) : (
          <div className="space-y-3">
            {creators.slice(0, 10).map((creator, index) => (
              <div
                key={creator.id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className={`w-6 text-center font-bold ${getMedalColor(index)}`}>
                  {index < 3 ? (
                    <Medal className="h-5 w-5 mx-auto" />
                  ) : (
                    <span className="text-sm">{index + 1}</span>
                  )}
                </div>

                <Avatar className="h-8 w-8">
                  <AvatarImage src={creator.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">
                    {creator.username.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {creator.username}
                  </p>
                </div>

                <div className="w-20 h-8">
                  <Sparklines data={creator.sparkline} svgWidth={80} svgHeight={32}>
                    <SparklinesLine
                      color={
                        creator.sparkline[creator.sparkline.length - 1] >
                        creator.sparkline[0]
                          ? "#22c55e"
                          : "#ef4444"
                      }
                    />
                  </Sparklines>
                </div>

                <div className="text-right">
                  <p className="text-sm font-bold text-green-500">
                    {formatCurrency(creator.earnings)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
