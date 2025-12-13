import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { format, differenceInHours, startOfMonth, endOfMonth } from "date-fns";
import { Video, CheckCircle, XCircle, Clock, ExternalLink, FileText, Download, Expand, Link2, Lightbulb } from "lucide-react";
import tiktokLogo from "@/assets/tiktok-logo-white.png";
import instagramLogo from "@/assets/instagram-logo-white.png";
import youtubeLogo from "@/assets/youtube-logo-white.png";
import xLogo from "@/assets/x-logo.png";

interface VideoSubmission {
  id: string;
  video_url: string;
  platform: string;
  submission_notes: string | null;
  status: string;
  payout_amount: number | null;
  submitted_at: string;
  reviewed_at: string | null;
  rejection_reason: string | null;
}

const platformIcons: Record<string, string> = {
  tiktok: tiktokLogo,
  instagram: instagramLogo,
  youtube: youtubeLogo,
  x: xLogo,
};

interface BoostCardProps {
  boost: {
    id: string;
    title: string;
    monthly_retainer: number;
    videos_per_month: number;
    content_style_requirements?: string;
    blueprint_embed_url?: string | null;
    brands?: {
      name: string;
      logo_url: string | null;
    };
  };
}

export function BoostCard({ boost }: BoostCardProps) {
  const [submissions, setSubmissions] = useState<VideoSubmission[]>([]);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [postsDialogOpen, setPostsDialogOpen] = useState(false);
  const [directionsDialogOpen, setDirectionsDialogOpen] = useState(false);

  useEffect(() => {
    fetchSubmissions();
  }, [boost.id]);

  const fetchSubmissions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("boost_video_submissions")
        .select("*")
        .eq("bounty_campaign_id", boost.id)
        .eq("user_id", user.id)
        .order("submitted_at", { ascending: false });

      if (data) setSubmissions(data);
    } catch (error) {
      console.error("Error fetching submissions:", error);
    }
  };

  const handleSubmitVideo = async () => {
    if (!videoUrl.trim()) {
      toast.error("Please enter a video URL");
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in");
        return;
      }

      const payoutPerVideo = boost.monthly_retainer / boost.videos_per_month;

      // Detect platform from URL
      let detectedPlatform = "tiktok";
      const url = videoUrl.toLowerCase();
      if (url.includes("instagram.com") || url.includes("instagr.am")) {
        detectedPlatform = "instagram";
      } else if (url.includes("youtube.com") || url.includes("youtu.be")) {
        detectedPlatform = "youtube";
      } else if (url.includes("twitter.com") || url.includes("x.com")) {
        detectedPlatform = "x";
      }

      const now = new Date();
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);
      
      const thisMonthSubmissions = submissions.filter(s => {
        const submitDate = new Date(s.submitted_at);
        return submitDate >= monthStart && submitDate <= monthEnd;
      });

      if (thisMonthSubmissions.length >= boost.videos_per_month) {
        toast.error(`You've reached your monthly limit of ${boost.videos_per_month} videos`);
        setSubmitting(false);
        return;
      }

      const dailyLimit = Math.ceil(boost.videos_per_month / 30);
      const last24Hours = submissions.filter(s => {
        const hoursDiff = differenceInHours(now, new Date(s.submitted_at));
        return hoursDiff < 24;
      });

      if (last24Hours.length >= dailyLimit) {
        toast.error(`You can only submit ${dailyLimit} video(s) per day`);
        setSubmitting(false);
        return;
      }

      const { error } = await supabase
        .from("boost_video_submissions")
        .insert({
          bounty_campaign_id: boost.id,
          user_id: user.id,
          video_url: videoUrl.trim(),
          platform: detectedPlatform,
          submission_notes: null,
          payout_amount: payoutPerVideo
        });

      if (error) throw error;

      toast.success("Video submitted successfully!");
      setSubmitDialogOpen(false);
      setVideoUrl("");
      fetchSubmissions();
    } catch (error) {
      console.error("Error submitting video:", error);
      toast.error("Failed to submit video");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "rejected":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Approved</Badge>;
      case "rejected":
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Rejected</Badge>;
      default:
        return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Pending</Badge>;
    }
  };

  const payoutPerVideo = boost.monthly_retainer / boost.videos_per_month;
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  
  const thisMonthSubmissions = submissions.filter(s => {
    const submitDate = new Date(s.submitted_at);
    return submitDate >= monthStart && submitDate <= monthEnd;
  });
  
  const approvedThisMonth = thisMonthSubmissions.filter(s => s.status === "approved").length;
  const pendingThisMonth = thisMonthSubmissions.filter(s => s.status === "pending").length;
  const earnedThisMonth = approvedThisMonth * payoutPerVideo;
  const dailyLimit = Math.ceil(boost.videos_per_month / 30);
  const last24Hours = submissions.filter(s => {
    const hoursDiff = differenceInHours(now, new Date(s.submitted_at));
    return hoursDiff < 24;
  });
  const dailyRemaining = Math.max(0, dailyLimit - last24Hours.length);

  const requiredPosts = Math.max(0, boost.videos_per_month - thisMonthSubmissions.length);
  const totalQuota = boost.videos_per_month;
  const earnedPercent = (approvedThisMonth / totalQuota) * 100;
  const pendingPercent = (pendingThisMonth / totalQuota) * 100;
  const requiredPercent = (requiredPosts / totalQuota) * 100;

  return (
    <>
      <Card className="bg-card border overflow-hidden font-inter tracking-[-0.5px]">
        <CardContent className="p-4 space-y-4">
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
            {/* Brand Logo + Info */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {boost.brands?.logo_url ? (
                <img 
                  src={boost.brands.logo_url} 
                  alt={boost.brands.name || ''} 
                  className="w-12 h-12 rounded-xl object-cover border flex-shrink-0" 
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                  <Video className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold truncate">{boost.title}</h3>
                <p className="text-xs text-muted-foreground truncate">{boost.brands?.name}</p>
              </div>
            </div>

            {/* Rate + Submit */}
            <div className="flex items-center gap-2">
              <div className="bg-muted rounded-lg px-3 py-1.5 text-xs font-medium">
                ${boost.monthly_retainer.toFixed(0)}/month
              </div>
              <Button 
                onClick={() => setSubmitDialogOpen(true)}
                size="sm"
                className="bg-foreground hover:bg-foreground/90 text-background font-semibold"
                disabled={thisMonthSubmissions.length >= boost.videos_per_month || dailyRemaining === 0}
              >
                Submit post
              </Button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="h-2 rounded-full bg-muted overflow-hidden flex">
              {earnedPercent > 0 && (
                <div 
                  className="h-full bg-green-500 transition-all" 
                  style={{ width: `${earnedPercent}%` }} 
                />
              )}
              {pendingPercent > 0 && (
                <div 
                  className="h-full bg-yellow-500 transition-all" 
                  style={{ width: `${pendingPercent}%` }} 
                />
              )}
              {requiredPercent > 0 && (
                <div 
                  className="h-full bg-muted-foreground/20 transition-all" 
                  style={{ width: `${requiredPercent}%` }} 
                />
              )}
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-muted-foreground">Earned</span>
                <span className="font-semibold">{approvedThisMonth}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-yellow-500" />
                <span className="text-muted-foreground">Submitted</span>
                <span className="font-semibold">{pendingThisMonth}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-muted-foreground/20" />
                <span className="text-muted-foreground">Still required</span>
                <span className="font-semibold">{requiredPosts}</span>
              </div>
            </div>
          </div>

          {/* Action Cards Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Directions Card */}
            <div 
              className="bg-muted/30 rounded-xl p-4 cursor-pointer hover:bg-muted/50 transition-colors group flex flex-col"
              onClick={() => setDirectionsDialogOpen(true)}
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-semibold">Directions and content</h4>
                <Expand className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="flex-1 flex items-center justify-center gap-2">
                <div className="p-2 bg-background rounded-lg border">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="p-2 bg-background rounded-lg border">
                  <Download className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </div>

            {/* My Posts Card */}
            <div 
              className="bg-muted/30 rounded-xl p-4 cursor-pointer hover:bg-muted/50 transition-colors group flex flex-col"
              onClick={() => setPostsDialogOpen(true)}
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-semibold">My posts ({submissions.length})</h4>
                <Expand className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="flex-1 flex items-center justify-center gap-2">
                <div className="bg-background rounded-lg px-3 py-1.5 border text-xs">
                  <span className="font-semibold">{pendingThisMonth}</span>
                  <span className="text-muted-foreground ml-1">Pending</span>
                </div>
                <div className="bg-background rounded-lg px-3 py-1.5 border text-xs">
                  <span className="font-semibold">{approvedThisMonth}</span>
                  <span className="text-muted-foreground ml-1">Approved</span>
                </div>
              </div>
            </div>

            {/* Quota Card */}
            <div className="bg-muted/30 rounded-xl p-4 flex flex-col">
              <h4 className="text-xs font-semibold mb-3">Monthly quota</h4>
              <div className="flex-1 flex items-center justify-center gap-2">
                <div className="bg-background rounded-lg px-3 py-1.5 border text-center">
                  <p className="text-sm font-bold">{thisMonthSubmissions.length}/{boost.videos_per_month}</p>
                  <p className="text-[10px] text-muted-foreground">Posts</p>
                </div>
                <div className="bg-background rounded-lg px-3 py-1.5 border text-center">
                  <p className="text-sm font-bold">${earnedThisMonth.toFixed(0)}</p>
                  <p className="text-[10px] text-muted-foreground">Earnings</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submit Video Dialog */}
      <Dialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
        <DialogContent className="sm:max-w-[480px] bg-background">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="font-inter tracking-[-0.5px] text-xl">Submit post</DialogTitle>
              <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                Daily limit: {last24Hours.length}/{dailyLimit}
              </Badge>
            </div>
            <DialogDescription>
              Link your Instagram, TikTok, YouTube post
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2">
                <Link2 className="h-5 w-5 text-muted-foreground" />
              </div>
              <Input
                placeholder="Paste link"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                className="pl-10 h-12 text-base border-2"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !submitting) {
                    handleSubmitVideo();
                  }
                }}
              />
            </div>

            <div className="bg-muted/50 rounded-xl p-4 flex items-start gap-3">
              <Lightbulb className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Submit clips as soon as you post them.</p>
                <p className="text-muted-foreground">Views gained before submission do not count toward payouts.</p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setSubmitDialogOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitVideo} 
              disabled={submitting || !videoUrl.trim()}
              className="flex-1 bg-foreground hover:bg-foreground/90 text-background"
            >
              {submitting ? "Submitting..." : "Submit"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Directions Dialog */}
      <Dialog open={directionsDialogOpen} onOpenChange={setDirectionsDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto bg-background">
          <DialogHeader>
            <DialogTitle className="font-inter tracking-[-0.5px] text-xl">Directions and content</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {boost.blueprint_embed_url ? (
              <iframe 
                src={boost.blueprint_embed_url} 
                className="w-full h-[400px] rounded-lg border"
                title="Boost directions"
              />
            ) : boost.content_style_requirements ? (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <p className="whitespace-pre-wrap text-muted-foreground">{boost.content_style_requirements}</p>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-40" />
                <p>No content guidelines available</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* My Posts Dialog */}
      <Dialog open={postsDialogOpen} onOpenChange={setPostsDialogOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto bg-background">
          <DialogHeader>
            <DialogTitle className="font-inter tracking-[-0.5px] text-xl">My posts ({submissions.length})</DialogTitle>
            <DialogDescription>
              Approved posts will continue generating earnings up to 7 days after the campaign closes.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {submissions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground border rounded-xl">
                <Video className="h-12 w-12 mx-auto mb-4 opacity-40" />
                <p className="font-semibold">No results found</p>
                <p className="text-sm">No posts submitted yet. Submit your first video to start earning.</p>
              </div>
            ) : (
              <Card className="border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Post</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Pay rate</TableHead>
                      <TableHead className="text-right">You earned</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {submissions.map((submission) => (
                      <TableRow key={submission.id}>
                        <TableCell>
                          <a 
                            href={submission.video_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-primary hover:underline"
                          >
                            <img 
                              src={platformIcons[submission.platform.toLowerCase()] || platformIcons.tiktok} 
                              alt={submission.platform} 
                              className="h-5 w-5" 
                            />
                            <ExternalLink className="h-4 w-4" />
                            <span className="text-sm truncate max-w-[150px]">{submission.video_url}</span>
                          </a>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(submission.status)}
                            {getStatusBadge(submission.status)}
                          </div>
                          {submission.rejection_reason && (
                            <p className="text-xs text-red-500 mt-1">{submission.rejection_reason}</p>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          ${payoutPerVideo.toFixed(0)}/video
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {submission.status === "approved" ? (
                            <span className="text-green-500">+${submission.payout_amount?.toFixed(2)}</span>
                          ) : submission.status === "pending" ? (
                            <span className="text-muted-foreground">-</span>
                          ) : (
                            <span className="text-red-500">$0</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
