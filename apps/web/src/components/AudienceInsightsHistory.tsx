import { useEffect, useState, useMemo } from "react";
import { Area, AreaChart, XAxis, YAxis, CartesianGrid } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { CheckCircle2, Clock, XCircle, TrendingUp, TrendingDown, Minus, ExternalLink, Play } from "lucide-react";
import tiktokLogoWhite from "@/assets/tiktok-logo-white.png";
import tiktokLogoBlack from "@/assets/tiktok-logo-black.png";
import instagramLogoWhite from "@/assets/instagram-logo-white.png";
import instagramLogoBlack from "@/assets/instagram-logo-black.png";
import youtubeLogoWhite from "@/assets/youtube-logo-white.png";
import youtubeLogoBlack from "@/assets/youtube-logo-black.png";
import { useTheme } from "@/components/ThemeProvider";

interface Submission {
  id: string;
  status: string;
  score: number | null;
  submitted_at: string;
  reviewed_at: string | null;
  screenshot_url: string | null;
  admin_notes: string | null;
  social_accounts?: {
    platform: string;
    username: string;
  };
}

interface AudienceInsightsHistoryProps {
  userId?: string;
  socialAccountIds?: string[];
  className?: string;
}

const chartConfig = {
  score: {
    label: "Score",
    color: "hsl(217.2 91.2% 59.8%)", // blue-500
  },
};

export function AudienceInsightsHistory({
  userId,
  socialAccountIds,
  className
}: AudienceInsightsHistoryProps) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    fetchSubmissions();
  }, [userId, socialAccountIds]);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('demographic_submissions')
        .select(`
          id,
          status,
          score,
          submitted_at,
          reviewed_at,
          screenshot_url,
          admin_notes,
          social_accounts(platform, username)
        `)
        .order('submitted_at', { ascending: false });

      if (socialAccountIds && socialAccountIds.length > 0) {
        query = query.in('social_account_id', socialAccountIds);
      } else if (userId) {
        // Get submissions through social accounts
        const { data: accounts } = await supabase
          .from('social_accounts')
          .select('id')
          .eq('user_id', userId);

        if (accounts && accounts.length > 0) {
          query = query.in('social_account_id', accounts.map(a => a.id));
        } else {
          setSubmissions([]);
          setLoading(false);
          return;
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      setSubmissions(data || []);
    } catch (error) {
      console.error('Error fetching submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPlatformIcon = (platform: string) => {
    const isDark = resolvedTheme === 'dark';
    switch (platform?.toLowerCase()) {
      case "tiktok":
        return <img src={isDark ? tiktokLogoWhite : tiktokLogoBlack} alt="TikTok" className="w-4 h-4" />;
      case "instagram":
        return <img src={isDark ? instagramLogoWhite : instagramLogoBlack} alt="Instagram" className="w-4 h-4" />;
      case "youtube":
        return <img src={isDark ? youtubeLogoWhite : youtubeLogoBlack} alt="YouTube" className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'approved':
        return {
          label: 'Verified',
          color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
          icon: CheckCircle2
        };
      case 'pending':
        return {
          label: 'Under Review',
          color: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
          icon: Clock
        };
      case 'rejected':
        return {
          label: 'Not Approved',
          color: 'bg-red-500/10 text-red-500 border-red-500/20',
          icon: XCircle
        };
      default:
        return {
          label: status,
          color: 'bg-muted text-muted-foreground',
          icon: Clock
        };
    }
  };

  // Prepare chart data from approved submissions
  const chartData = useMemo(() => {
    const approvedSubmissions = submissions
      .filter(s => s.status === 'approved' && s.score !== null)
      .sort((a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime());

    return approvedSubmissions.map(s => ({
      date: format(new Date(s.submitted_at), 'MMM d'),
      fullDate: format(new Date(s.submitted_at), 'MMM d, yyyy'),
      score: s.score,
      platform: s.social_accounts?.platform || 'Unknown'
    }));
  }, [submissions]);

  // Calculate current average score
  const currentScore = useMemo(() => {
    const approvedScores = submissions
      .filter(s => s.status === 'approved' && s.score !== null)
      .map(s => s.score as number);

    if (approvedScores.length === 0) return null;
    return Math.round(approvedScores.reduce((a, b) => a + b, 0) / approvedScores.length);
  }, [submissions]);

  // Calculate score trend
  const scoreTrend = useMemo(() => {
    if (chartData.length < 2) return null;
    const latest = chartData[chartData.length - 1]?.score || 0;
    const previous = chartData[chartData.length - 2]?.score || 0;
    return latest - previous;
  }, [chartData]);

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="h-[200px] flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground text-sm">Loading history...</div>
        </div>
      </div>
    );
  }

  if (submissions.length === 0) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="h-[150px] flex flex-col items-center justify-center text-center p-4 rounded-lg bg-muted/30 border border-border/50">
          <p className="text-sm text-muted-foreground font-inter tracking-[-0.3px]">
            No audience insights submissions yet
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Submit your first insights to start tracking your score
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Current Score Summary */}
      {currentScore !== null && (
        <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/30 border border-border/50">
          <div className="flex-1">
            <p className="text-xs text-muted-foreground font-inter tracking-[-0.3px] uppercase">Current Score</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold font-inter tracking-[-0.5px]">{currentScore}%</span>
              {scoreTrend !== null && scoreTrend !== 0 && (
                <span className={`flex items-center gap-0.5 text-xs ${scoreTrend > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {scoreTrend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {scoreTrend > 0 ? '+' : ''}{scoreTrend}%
                </span>
              )}
              {scoreTrend === 0 && (
                <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                  <Minus className="h-3 w-3" />
                  No change
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">{chartData.length} verified</p>
            <p className="text-xs text-muted-foreground">{submissions.filter(s => s.status === 'pending').length} pending</p>
          </div>
        </div>
      )}

      {/* Score Chart */}
      {chartData.length > 1 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-inter tracking-[-0.3px] uppercase">Score History</p>
          <ChartContainer config={chartConfig} className="h-[150px] w-full">
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(217.2 91.2% 59.8%)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(217.2 91.2% 59.8%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="hsl(var(--border))"
                strokeOpacity={0.5}
              />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10 }}
                tickMargin={8}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10 }}
                tickMargin={8}
                domain={[0, 100]}
                tickFormatter={(value) => `${value}%`}
                width={40}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(label, payload) => {
                      const data = payload?.[0]?.payload;
                      return data?.fullDate || label;
                    }}
                    formatter={(value, name, props) => (
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-muted-foreground">Score</span>
                        <span className="font-semibold text-blue-500">{value}%</span>
                      </div>
                    )}
                  />
                }
              />
              <Area
                type="monotone"
                dataKey="score"
                stroke="hsl(217.2 91.2% 59.8%)"
                strokeWidth={2}
                fill="url(#scoreGradient)"
                dot={{ r: 3, fill: "hsl(217.2 91.2% 59.8%)", strokeWidth: 0 }}
                activeDot={{ r: 5, strokeWidth: 0, fill: "hsl(217.2 91.2% 59.8%)" }}
              />
            </AreaChart>
          </ChartContainer>
        </div>
      )}

      {/* Submissions List */}
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground font-inter tracking-[-0.3px] uppercase">All Submissions</p>
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {submissions.map((submission, index) => {
            const statusConfig = getStatusConfig(submission.status);
            const StatusIcon = statusConfig.icon;
            const prevSubmission = submissions[index + 1];
            const scoreChange = submission.score !== null && prevSubmission?.score !== null
              ? submission.score - prevSubmission.score
              : null;

            return (
              <div
                key={submission.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => setSelectedSubmission(submission)}
              >
                {/* Platform Icon */}
                <div className="flex-shrink-0">
                  {getPlatformIcon(submission.social_accounts?.platform || '')}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium font-inter tracking-[-0.3px] truncate">
                      @{submission.social_accounts?.username || 'Unknown'}
                    </span>
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${statusConfig.color}`}>
                      {statusConfig.label}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(submission.submitted_at), 'MMM d, yyyy')}
                  </p>
                </div>

                {/* Score */}
                {submission.status === 'approved' && submission.score !== null && (
                  <div className="text-right flex-shrink-0">
                    <p className="text-lg font-bold font-inter tracking-[-0.5px]">{submission.score}%</p>
                    {scoreChange !== null && scoreChange !== 0 && (
                      <p className={`text-[10px] ${scoreChange > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        {scoreChange > 0 ? '+' : ''}{scoreChange}%
                      </p>
                    )}
                  </div>
                )}

                {/* View indicator */}
                <Play className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </div>
            );
          })}
        </div>
      </div>

      {/* Video Preview Dialog */}
      <Dialog open={!!selectedSubmission} onOpenChange={() => setSelectedSubmission(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="font-inter tracking-[-0.5px]">
              Audience Insights Submission
            </DialogTitle>
            <DialogDescription>
              {selectedSubmission && format(new Date(selectedSubmission.submitted_at), "MMMM d, yyyy 'at' h:mm a")}
            </DialogDescription>
          </DialogHeader>

          {selectedSubmission?.screenshot_url && (
            <div className="space-y-4">
              <video
                src={selectedSubmission.screenshot_url}
                controls
                className="w-full rounded-lg bg-black"
                style={{ maxHeight: '350px' }}
              />

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div>
                  <p className="text-sm font-medium">Status</p>
                  <Badge variant="outline" className={getStatusConfig(selectedSubmission.status).color}>
                    {getStatusConfig(selectedSubmission.status).label}
                  </Badge>
                </div>
                {selectedSubmission.score !== null && (
                  <div className="text-right">
                    <p className="text-sm font-medium">Score</p>
                    <p className="text-2xl font-bold">{selectedSubmission.score}%</p>
                  </div>
                )}
              </div>

              {selectedSubmission.status === 'rejected' && selectedSubmission.admin_notes && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-xs font-medium text-red-400 mb-1">Why it wasn't approved:</p>
                  <p className="text-sm text-muted-foreground">{selectedSubmission.admin_notes}</p>
                </div>
              )}

              <Button
                variant="outline"
                className="w-full"
                onClick={() => window.open(selectedSubmission.screenshot_url!, '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in New Tab
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
