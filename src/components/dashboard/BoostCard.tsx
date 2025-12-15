import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { format, differenceInHours, startOfMonth, endOfMonth } from "date-fns";
import { Video, CheckCircle, XCircle, Clock, ExternalLink, FileText, Download, Expand, Link2, Lightbulb, Trash2 } from "lucide-react";
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
    blueprint_id?: string | null;
    blueprint_embed_url?: string | null;
    brands?: {
      name: string;
      logo_url: string | null;
    };
    blueprint?: {
      content: string | null;
      hooks: any[] | null;
      talking_points: any[] | null;
      dos_and_donts: any | null;
      call_to_action: string | null;
      content_guidelines: string | null;
    } | null;
  };
}

export function BoostCard({ boost }: BoostCardProps) {
  const navigate = useNavigate();
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

  const handleWithdrawSubmission = async (submissionId: string) => {
    try {
      const { error } = await supabase
        .from("boost_video_submissions")
        .delete()
        .eq("id", submissionId);

      if (error) throw error;

      toast.success("Submission withdrawn");
      fetchSubmissions();
    } catch (error) {
      console.error("Error withdrawing submission:", error);
      toast.error("Failed to withdraw submission");
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
    const baseClasses = "font-inter tracking-[-0.5px] text-[10px] font-medium border-0 bg-transparent px-0 hover:bg-transparent";
    switch (status) {
      case "approved":
        return <Badge className={`${baseClasses} text-green-500`}>Approved</Badge>;
      case "rejected":
        return <Badge className={`${baseClasses} text-red-500`}>Rejected</Badge>;
      default:
        return <Badge className={`${baseClasses} text-yellow-500`}>Pending</Badge>;
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

            {/* Submit Button - Desktop only */}
            <Button 
              onClick={() => setSubmitDialogOpen(true)}
              size="sm"
              className="hidden sm:flex bg-foreground hover:bg-foreground/90 text-background font-semibold"
              disabled={thisMonthSubmissions.length >= boost.videos_per_month || dailyRemaining === 0}
            >
              Submit post
            </Button>
          </div>

          {/* Submit Button - Mobile only (full width at bottom) */}
          <Button 
            onClick={() => setSubmitDialogOpen(true)}
            className="sm:hidden w-full bg-foreground hover:bg-foreground/90 text-background font-semibold"
            disabled={thisMonthSubmissions.length >= boost.videos_per_month || dailyRemaining === 0}
          >
            Submit post
          </Button>


          {/* Stats Overview */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-muted/30 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-green-500">${earnedThisMonth.toFixed(0)}</p>
              <p className="text-[10px] text-muted-foreground">Earned this month</p>
            </div>
            <div className="bg-muted/30 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-orange-500">${(pendingThisMonth * payoutPerVideo).toFixed(0)}</p>
              <p className="text-[10px] text-muted-foreground">Pending payout</p>
            </div>
            <div className="bg-muted/30 rounded-xl p-3 text-center">
              <p className="text-lg font-bold">${payoutPerVideo.toFixed(0)}</p>
              <p className="text-[10px] text-muted-foreground">Per video</p>
            </div>
            <div className="bg-muted/30 rounded-xl p-3 text-center">
              <p className="text-lg font-bold">${boost.monthly_retainer}</p>
              <p className="text-[10px] text-muted-foreground">Max monthly</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Monthly Progress</span>
              <span className="font-semibold">{thisMonthSubmissions.length} / {boost.videos_per_month} videos</span>
            </div>
            <div className="h-2.5 bg-muted rounded-full overflow-hidden flex">
              {approvedThisMonth > 0 && (
                <div 
                  className="h-full bg-green-500 transition-all duration-500" 
                  style={{ width: `${earnedPercent}%` }}
                />
              )}
              {pendingThisMonth > 0 && (
                <div 
                  className="h-full bg-orange-500 transition-all duration-500" 
                  style={{ width: `${pendingPercent}%` }}
                />
              )}
            </div>
            <div className="flex items-center gap-4 text-[10px]">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-muted-foreground">{approvedThisMonth} Approved</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-orange-500" />
                <span className="text-muted-foreground">{pendingThisMonth} Pending</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-muted" />
                <span className="text-muted-foreground">{requiredPosts} Remaining</span>
              </div>
            </div>
          </div>

          {/* Action Cards Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Directions Card */}
            <div 
              className="bg-muted/30 rounded-xl p-4 cursor-pointer hover:bg-muted/50 transition-colors group"
              onClick={() => {
                if (boost.blueprint_id) {
                  navigate(`/blueprint/${boost.blueprint_id}`);
                } else {
                  toast.error("No blueprint linked to this boost");
                }
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-background rounded-lg border">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold">Directions & content</h4>
                    <p className="text-[10px] text-muted-foreground">View campaign brief</p>
                  </div>
                </div>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>

            {/* My Posts Card */}
            <div 
              className="bg-muted/30 rounded-xl p-4 cursor-pointer hover:bg-muted/50 transition-colors group"
              onClick={() => setPostsDialogOpen(true)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-background rounded-lg border">
                    <Video className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold">My posts ({submissions.length})</h4>
                    <p className="text-[10px] text-muted-foreground">{dailyRemaining} submissions left today</p>
                  </div>
                </div>
                <Expand className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submit Video Dialog */}
      <Dialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
        <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden bg-card border-none [&>button]:hidden">
          {/* Header */}
          <div className="px-5 pt-5 pb-0">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-geist tracking-[-0.5px] text-lg font-semibold">
                Submit post
              </h2>
              <span className="text-xs font-inter tracking-[-0.5px] text-muted-foreground">
                {last24Hours.length}/{dailyLimit} today
              </span>
            </div>
            <p className="text-sm text-muted-foreground font-inter tracking-[-0.5px]">
              Link your Instagram, TikTok, or YouTube post
            </p>
          </div>
          
          {/* Content */}
          <div className="px-5 py-4 space-y-4">
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2">
                <Link2 className="h-4 w-4 text-muted-foreground" />
              </div>
              <Input
                placeholder="Paste video link..."
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                className="pl-11 h-12 bg-muted/30 border-0 rounded-xl font-inter tracking-[-0.5px] text-sm placeholder:text-muted-foreground/60"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !submitting) {
                    handleSubmitVideo();
                  }
                }}
              />
            </div>

            <div className="bg-muted/20 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-yellow-500/10 flex items-center justify-center shrink-0">
                  <Lightbulb className="h-4 w-4 text-yellow-500" />
                </div>
                <div>
                  <p className="text-sm font-medium font-inter tracking-[-0.5px]">
                    Submit clips immediately
                  </p>
                  <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px] mt-0.5">
                    Views before submission don't count toward payouts
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-2 px-5 pb-5">
            <Button 
              variant="ghost" 
              onClick={() => setSubmitDialogOpen(false)} 
              className="flex-1 h-11 rounded-xl font-inter tracking-[-0.5px] text-sm bg-muted/30 hover:bg-muted hover:text-foreground"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitVideo} 
              disabled={submitting || !videoUrl.trim()}
              className="flex-1 h-11 rounded-xl font-inter tracking-[-0.5px] text-sm"
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
            ) : boost.blueprint ? (
              <div className="space-y-6">
                {boost.blueprint.content && (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <div dangerouslySetInnerHTML={{ __html: boost.blueprint.content }} />
                  </div>
                )}
                
                {boost.blueprint.content_guidelines && (
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Content Guidelines</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{boost.blueprint.content_guidelines}</p>
                  </div>
                )}
                
                {boost.blueprint.hooks && boost.blueprint.hooks.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Hooks</h4>
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                      {boost.blueprint.hooks.map((hook: any, i: number) => (
                        <li key={i}>{typeof hook === 'string' ? hook : hook.text || hook.hook}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {boost.blueprint.talking_points && boost.blueprint.talking_points.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Talking Points</h4>
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                      {boost.blueprint.talking_points.map((point: any, i: number) => (
                        <li key={i}>{typeof point === 'string' ? point : point.text || point.point}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {boost.blueprint.dos_and_donts && (
                  <div className="grid grid-cols-2 gap-4">
                    {boost.blueprint.dos_and_donts.dos && boost.blueprint.dos_and_donts.dos.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-sm mb-2 text-green-500">Do's</h4>
                        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                          {boost.blueprint.dos_and_donts.dos.map((item: string, i: number) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {boost.blueprint.dos_and_donts.donts && boost.blueprint.dos_and_donts.donts.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-sm mb-2 text-red-500">Don'ts</h4>
                        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                          {boost.blueprint.dos_and_donts.donts.map((item: string, i: number) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
                
                {boost.blueprint.call_to_action && (
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Call to Action</h4>
                    <p className="text-sm text-muted-foreground">{boost.blueprint.call_to_action}</p>
                  </div>
                )}
              </div>
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
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto bg-background border-0">
          <DialogHeader className="pb-2">
            <DialogTitle className="font-inter tracking-[-0.5px] text-lg font-medium">
              My Posts
            </DialogTitle>
            <p className="text-sm text-muted-foreground font-inter tracking-[-0.5px]">
              {submissions.length} submission{submissions.length !== 1 ? 's' : ''} • Earnings tracked for 7 days after campaign ends
            </p>
          </DialogHeader>
          
          <div className="space-y-3 pt-2">
            {submissions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                  <Video className="h-6 w-6 text-muted-foreground/60" />
                </div>
                <p className="font-inter tracking-[-0.5px] font-medium text-foreground">No posts yet</p>
                <p className="text-sm text-muted-foreground font-inter tracking-[-0.5px] mt-1">
                  Submit your first video to start earning
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {submissions.map((submission) => (
                  <div 
                    key={submission.id}
                    className="group relative overflow-hidden rounded-xl border border-border/50 bg-gradient-to-br from-muted/20 to-muted/40 transition-all hover:border-border hover:shadow-sm"
                  >
                    {/* Status accent bar */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                      submission.status === "approved" ? "bg-green-500" : 
                      submission.status === "rejected" ? "bg-red-500" : 
                      "bg-yellow-500"
                    }`} />
                    
                    <div className="flex items-center justify-between p-4 pl-5">
                      <div className="flex items-center gap-4 min-w-0 flex-1">
                        {/* Platform icon */}
                        <div className="h-10 w-10 rounded-xl bg-background/80 backdrop-blur-sm flex items-center justify-center shrink-0 border border-border/30">
                          <img 
                            src={platformIcons[submission.platform.toLowerCase()] || platformIcons.tiktok} 
                            alt={submission.platform} 
                            className="h-5 w-5" 
                          />
                        </div>
                        
                        {/* Content */}
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <div className="flex items-center gap-2">
                            {getStatusBadge(submission.status)}
                            <span className="text-[10px] text-muted-foreground font-inter tracking-[-0.5px]">
                              {format(new Date(submission.submitted_at), "MMM d, h:mm a")}
                            </span>
                          </div>
                          <a 
                            href={submission.video_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-sm font-inter tracking-[-0.5px] text-muted-foreground hover:text-foreground transition-colors group/link"
                          >
                            <span className="truncate max-w-[180px]">
                              {(() => {
                                try {
                                  return new URL(submission.video_url).pathname.split('/').pop() || 'View post';
                                } catch {
                                  return 'View post';
                                }
                              })()}
                            </span>
                            <ExternalLink className="h-3 w-3 shrink-0 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                          </a>
                          {submission.rejection_reason && (
                            <p className="text-xs text-destructive/80 font-inter tracking-[-0.5px] line-clamp-1">
                              {submission.rejection_reason}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {/* Right side - payout & actions */}
                      <div className="flex items-center gap-3 shrink-0 pl-4">
                        <div className="text-right">
                          <p className="text-sm font-semibold font-inter tracking-[-0.5px]">
                            {submission.status === "approved" ? (
                              <span className="text-green-500">+${submission.payout_amount?.toFixed(2)}</span>
                            ) : submission.status === "pending" ? (
                              <span className="text-muted-foreground">${payoutPerVideo.toFixed(0)}</span>
                            ) : (
                              <span className="text-destructive line-through">${payoutPerVideo.toFixed(0)}</span>
                            )}
                          </p>
                          <p className="text-[10px] text-muted-foreground font-inter tracking-[-0.5px]">
                            {submission.status === "approved" ? "earned" : submission.status === "pending" ? "potential" : "rejected"}
                          </p>
                        </div>
                        
                        {/* Withdraw button - only for pending submissions */}
                        {submission.status === "pending" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleWithdrawSubmission(submission.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
