import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { SmilePlus, ThumbsUp, ThumbsDown, Minus, MessageSquare, TrendingUp, TrendingDown } from "lucide-react";
import { format } from "date-fns";

interface DiscordReactionAnalyticsProps {
  brandId: string;
}

interface ReactionTracking {
  id: string;
  message_id: string;
  message_preview: string | null;
  reactions: Record<string, number>;
  positive_count: number;
  negative_count: number;
  neutral_count: number;
  total_reactions: number;
  sentiment_score: number;
  first_tracked_at: string;
  last_updated_at: string;
  broadcast?: {
    title: string;
  };
}

export function DiscordReactionAnalytics({ brandId }: DiscordReactionAnalyticsProps) {
  const [trackings, setTrackings] = useState<ReactionTracking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [aggregateStats, setAggregateStats] = useState({
    totalMessages: 0,
    totalReactions: 0,
    avgSentiment: 0,
    positiveRatio: 0,
  });

  useEffect(() => {
    fetchData();
  }, [brandId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("discord_reaction_tracking")
        .select(`
          *,
          broadcast:broadcast_id(title)
        `)
        .eq("brand_id", brandId)
        .order("last_updated_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      const trackingData = (data || []) as ReactionTracking[];
      setTrackings(trackingData);

      // Calculate aggregate stats
      if (trackingData.length > 0) {
        const totalMessages = trackingData.length;
        const totalReactions = trackingData.reduce((sum, t) => sum + t.total_reactions, 0);
        const avgSentiment = trackingData.reduce((sum, t) => sum + (t.sentiment_score || 0), 0) / totalMessages;
        const totalPositive = trackingData.reduce((sum, t) => sum + t.positive_count, 0);
        const positiveRatio = totalReactions > 0 ? (totalPositive / totalReactions) * 100 : 0;

        setAggregateStats({
          totalMessages,
          totalReactions,
          avgSentiment,
          positiveRatio,
        });
      }
    } catch (error) {
      console.error("Error fetching reaction data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getSentimentColor = (score: number): string => {
    if (score > 0.3) return "text-green-500";
    if (score < -0.3) return "text-red-500";
    return "text-yellow-500";
  };

  const getSentimentBg = (score: number): string => {
    if (score > 0.3) return "bg-green-500/10";
    if (score < -0.3) return "bg-red-500/10";
    return "bg-yellow-500/10";
  };

  const getSentimentLabel = (score: number): string => {
    if (score > 0.5) return "Very Positive";
    if (score > 0.2) return "Positive";
    if (score > -0.2) return "Neutral";
    if (score > -0.5) return "Negative";
    return "Very Negative";
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reaction Analytics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Aggregate Stats */}
      <div className="grid grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <MessageSquare className="h-3.5 w-3.5" />
            Tracked Messages
          </div>
          <p className="text-xl font-bold">{aggregateStats.totalMessages}</p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <SmilePlus className="h-3.5 w-3.5" />
            Total Reactions
          </div>
          <p className="text-xl font-bold">{aggregateStats.totalReactions}</p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <ThumbsUp className="h-3.5 w-3.5" />
            Positive Rate
          </div>
          <p className="text-xl font-bold">{aggregateStats.positiveRatio.toFixed(0)}%</p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            {aggregateStats.avgSentiment >= 0 ? (
              <TrendingUp className="h-3.5 w-3.5" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5" />
            )}
            Avg Sentiment
          </div>
          <p className={`text-xl font-bold ${getSentimentColor(aggregateStats.avgSentiment)}`}>
            {aggregateStats.avgSentiment >= 0 ? "+" : ""}
            {aggregateStats.avgSentiment.toFixed(2)}
          </p>
        </Card>
      </div>

      {/* Message List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <SmilePlus className="h-4 w-4" />
            Reaction Sentiment
          </CardTitle>
          <CardDescription>
            Track how your Discord community reacts to announcements
          </CardDescription>
        </CardHeader>
        <CardContent>
          {trackings.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No reaction data yet. Reactions on tracked messages will appear here.
            </p>
          ) : (
            <div className="space-y-3">
              {trackings.map((tracking) => (
                <div
                  key={tracking.id}
                  className="p-3 rounded-lg border bg-muted/30"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {tracking.broadcast?.title || tracking.message_preview || "Discord Message"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(tracking.last_updated_at), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`${getSentimentBg(tracking.sentiment_score)} ${getSentimentColor(tracking.sentiment_score)} border-0`}
                    >
                      {getSentimentLabel(tracking.sentiment_score)}
                    </Badge>
                  </div>

                  <div className="mt-3 space-y-2">
                    {/* Sentiment bar */}
                    <div className="flex items-center gap-2">
                      <ThumbsUp className="h-3.5 w-3.5 text-green-500" />
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full flex">
                          <div
                            className="bg-green-500 h-full"
                            style={{
                              width: tracking.total_reactions > 0
                                ? `${(tracking.positive_count / tracking.total_reactions) * 100}%`
                                : "0%",
                            }}
                          />
                          <div
                            className="bg-yellow-500 h-full"
                            style={{
                              width: tracking.total_reactions > 0
                                ? `${(tracking.neutral_count / tracking.total_reactions) * 100}%`
                                : "0%",
                            }}
                          />
                          <div
                            className="bg-red-500 h-full"
                            style={{
                              width: tracking.total_reactions > 0
                                ? `${(tracking.negative_count / tracking.total_reactions) * 100}%`
                                : "0%",
                            }}
                          />
                        </div>
                      </div>
                      <ThumbsDown className="h-3.5 w-3.5 text-red-500" />
                    </div>

                    {/* Reaction counts */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-green-500" />
                        {tracking.positive_count} positive
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-yellow-500" />
                        {tracking.neutral_count} neutral
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-red-500" />
                        {tracking.negative_count} negative
                      </span>
                      <span className="ml-auto font-medium">
                        {tracking.total_reactions} total
                      </span>
                    </div>

                    {/* Top reactions */}
                    {Object.keys(tracking.reactions || {}).length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap pt-1">
                        {Object.entries(tracking.reactions as Record<string, number>)
                          .sort(([, a], [, b]) => b - a)
                          .slice(0, 8)
                          .map(([emoji, count]) => (
                            <span
                              key={emoji}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-xs"
                            >
                              {emoji} {count}
                            </span>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
