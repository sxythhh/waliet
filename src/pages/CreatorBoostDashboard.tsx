import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { format, differenceInHours, startOfMonth, endOfMonth } from "date-fns";
import { Video, CheckCircle, XCircle, Clock, ExternalLink, FileText, Download, Expand, Link2, Lightbulb, MoreVertical, ArrowLeft } from "lucide-react";
import tiktokLogo from "@/assets/tiktok-logo-white.png";
import instagramLogo from "@/assets/instagram-logo-white.png";
import youtubeLogo from "@/assets/youtube-logo-white.png";
import xLogo from "@/assets/x-logo.png";

interface BoostCampaign {
  id: string;
  title: string;
  description: string | null;
  monthly_retainer: number;
  videos_per_month: number;
  content_style_requirements: string;
  status: string;
  brand_id: string;
  blueprint_embed_url: string | null;
}

interface Brand {
  name: string;
  logo_url: string | null;
}

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

interface CreatorBoostDashboardProps {
  boostId?: string;
}

export default function CreatorBoostDashboard({ boostId: propBoostId }: CreatorBoostDashboardProps = {}) {
  const { id: paramId } = useParams();
  const id = propBoostId || paramId;
  const navigate = useNavigate();
  const [boost, setBoost] = useState<BoostCampaign | null>(null);
  const [brand, setBrand] = useState<Brand | null>(null);
  const [submissions, setSubmissions] = useState<VideoSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [postsDialogOpen, setPostsDialogOpen] = useState(false);
  const [directionsDialogOpen, setDirectionsDialogOpen] = useState(false);

  useEffect(() => {
    if (id) fetchBoostData();
  }, [id]);

  const fetchBoostData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to view this boost");
        navigate("/");
        return;
      }

      // Check if user is accepted to this boost
      const { data: application } = await supabase
        .from("bounty_applications")
        .select("id, status")
        .eq("bounty_campaign_id", id)
        .eq("user_id", user.id)
        .eq("status", "accepted")
        .maybeSingle();

      if (!application) {
        toast.error("You must be accepted to view this boost");
        navigate("/dashboard");
        return;
      }

      // Fetch boost data
      const { data: boostData, error: boostError } = await supabase
        .from("bounty_campaigns")
        .select("*")
        .eq("id", id)
        .single();

      if (boostError || !boostData) {
        toast.error("Boost not found");
        navigate("/dashboard");
        return;
      }
      setBoost(boostData);

      // Fetch brand data
      const { data: brandData } = await supabase
        .from("brands")
        .select("name, logo_url")
        .eq("id", boostData.brand_id)
        .single();
      
      if (brandData) setBrand(brandData);

      // Fetch user's submissions
      const { data: submissionsData } = await supabase
        .from("boost_video_submissions")
        .select("*")
        .eq("bounty_campaign_id", id)
        .eq("user_id", user.id)
        .order("submitted_at", { ascending: false });

      if (submissionsData) setSubmissions(submissionsData);
    } catch (error) {
      console.error("Error fetching boost:", error);
      toast.error("Failed to load boost");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitVideo = async () => {
    if (!videoUrl.trim()) {
      toast.error("Please enter a video URL");
      return;
    }

    if (!boost) return;

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in");
        return;
      }

      // Calculate payout amount per video
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

      // Check submission limit (based on monthly quota)
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

      // Check daily limit (1 video per 24 hours based on quota)
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
      fetchBoostData();
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

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <Skeleton className="h-24 w-full rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!boost) return null;

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

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Back button for mobile */}
      <Button 
        variant="ghost" 
        size="sm"
        className="md:hidden -ml-2 gap-1.5"
        onClick={() => navigate("/dashboard?tab=campaigns")}
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>

      {/* Header Card */}
      <Card className="bg-card border overflow-hidden">
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col md:flex-row gap-4 md:gap-6 md:items-center">
            {/* Brand Logo + Info */}
            <div className="flex items-center gap-4 flex-1 min-w-0">
              {brand?.logo_url ? (
                <img 
                  src={brand.logo_url} 
                  alt={brand.name} 
                  className="w-14 h-14 rounded-xl object-cover border flex-shrink-0" 
                />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                  <Video className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-semibold font-inter tracking-[-0.5px] truncate">{boost.title}</h1>
                  <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 flex-shrink-0 text-[10px]">
                    LIVE
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground truncate">{brand?.name}</p>
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-6 text-center border-t md:border-t-0 md:border-l border-border/50 pt-4 md:pt-0 md:pl-6">
              <div>
                <p className="text-lg font-bold">${earnedThisMonth.toFixed(0)}</p>
                <p className="text-xs text-muted-foreground">Earned</p>
              </div>
              <div>
                <p className="text-lg font-bold">{approvedThisMonth}</p>
                <p className="text-xs text-muted-foreground">Approved</p>
              </div>
              <div>
                <p className="text-lg font-bold">{pendingThisMonth}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            </div>

            {/* Rate Badge */}
            <div className="flex items-center gap-3 border-t md:border-t-0 md:border-l border-border/50 pt-4 md:pt-0 md:pl-6">
              <div className="bg-muted rounded-xl px-4 py-2 text-center">
                <p className="text-sm font-semibold">${payoutPerVideo.toFixed(0)} per video</p>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex items-center gap-2">
              <Button 
                onClick={() => setSubmitDialogOpen(true)}
                className="bg-foreground hover:bg-foreground/90 text-background font-semibold px-6"
                disabled={thisMonthSubmissions.length >= boost.videos_per_month || dailyRemaining === 0}
              >
                Submit post
              </Button>
              <Button variant="ghost" size="icon" className="text-muted-foreground">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Directions Card */}
        <Card 
          className="bg-muted/30 border-0 cursor-pointer hover:bg-muted/50 transition-colors group"
          onClick={() => setDirectionsDialogOpen(true)}
        >
          <CardContent className="p-6 h-40 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold font-inter tracking-[-0.5px]">Directions and content</h3>
              <Expand className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="flex-1 flex items-center justify-center gap-3">
              <div className="p-3 bg-background rounded-xl border">
                <FileText className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="p-3 bg-background rounded-xl border">
                <Download className="h-6 w-6 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* My Posts Card */}
        <Card 
          className="bg-muted/30 border-0 cursor-pointer hover:bg-muted/50 transition-colors group"
          onClick={() => setPostsDialogOpen(true)}
        >
          <CardContent className="p-6 h-40 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold font-inter tracking-[-0.5px]">My posts ({submissions.length})</h3>
              <Expand className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="flex-1 flex items-center justify-center gap-3">
              <div className="bg-background rounded-lg px-4 py-2 border text-sm">
                <span className="font-semibold">{pendingThisMonth}</span>
                <span className="text-muted-foreground ml-1.5">Pending</span>
              </div>
              <div className="bg-background rounded-lg px-4 py-2 border text-sm">
                <span className="font-semibold">{approvedThisMonth}</span>
                <span className="text-muted-foreground ml-1.5">Approved</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Card */}
        <Card className="bg-muted/30 border-0">
          <CardContent className="p-6 h-40 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold font-inter tracking-[-0.5px]">Monthly quota</h3>
            </div>
            <div className="flex-1 flex items-center justify-center gap-4">
              <div className="bg-background rounded-lg px-4 py-2.5 border text-center">
                <p className="text-lg font-semibold">{thisMonthSubmissions.length}/{boost.videos_per_month}</p>
                <p className="text-xs text-muted-foreground">Posts</p>
              </div>
              <div className="bg-background rounded-lg px-4 py-2.5 border text-center">
                <p className="text-lg font-semibold">${earnedThisMonth.toFixed(0)}</p>
                <p className="text-xs text-muted-foreground">Earnings</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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
            {/* Stats Summary */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="border">
                <CardContent className="p-4">
                  <h4 className="font-semibold text-sm mb-1">Campaign views</h4>
                  <p className="text-xs text-muted-foreground">Total views from all of your approved clips will be shown here.</p>
                </CardContent>
              </Card>
              <Card className="border">
                <CardContent className="p-4">
                  <h4 className="font-semibold text-sm mb-1">Earnings</h4>
                  <p className="text-xs text-muted-foreground">Earn ${payoutPerVideo.toFixed(0)} per approved video.</p>
                </CardContent>
              </Card>
            </div>

            {/* Posts Table */}
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
    </div>
  );
}
