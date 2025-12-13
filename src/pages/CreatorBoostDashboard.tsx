import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { format, differenceInHours, startOfMonth, endOfMonth } from "date-fns";
import { Plus, Video, DollarSign, CheckCircle, XCircle, Clock, AlertCircle, ExternalLink } from "lucide-react";
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

export default function CreatorBoostDashboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [boost, setBoost] = useState<BoostCampaign | null>(null);
  const [brand, setBrand] = useState<Brand | null>(null);
  const [submissions, setSubmissions] = useState<VideoSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [platform, setPlatform] = useState("tiktok");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    fetchBoostData();
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
          platform,
          submission_notes: notes.trim() || null,
          payout_amount: payoutPerVideo
        });

      if (error) throw error;

      toast.success("Video submitted successfully!");
      setSubmitDialogOpen(false);
      setVideoUrl("");
      setNotes("");
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
      <div className="min-h-screen bg-background">
        <div className="container max-w-6xl mx-auto px-4 py-8">
          <div className="grid gap-6">
            <Skeleton className="h-48 w-full rounded-xl" />
            <div className="grid md:grid-cols-3 gap-4">
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </div>
          </div>
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
  const progressPercent = (thisMonthSubmissions.length / boost.videos_per_month) * 100;

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-6xl mx-auto px-4 py-8">
        <div className="grid gap-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row gap-6 items-start">
            {brand?.logo_url && (
              <img 
                src={brand.logo_url} 
                alt={brand.name} 
                className="w-20 h-20 rounded-xl object-cover border" 
              />
            )}
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl md:text-3xl font-bold font-inter tracking-[-0.5px]">{boost.title}</h1>
                <Badge variant="outline" className={
                  boost.status === 'active' 
                    ? 'bg-green-500/10 text-green-500 border-green-500/20' 
                    : 'bg-gray-500/10 text-gray-500 border-gray-500/20'
                }>
                  {boost.status}
                </Badge>
              </div>
              <p className="text-muted-foreground">{brand?.name}</p>
              {boost.description && (
                <p className="text-sm text-muted-foreground max-w-2xl">{boost.description}</p>
              )}
            </div>
            <Button 
              onClick={() => setSubmitDialogOpen(true)}
              className="bg-[#2060de] hover:bg-[#1a50c8] text-white border-t border-[#4b85f7] gap-2"
              disabled={thisMonthSubmissions.length >= boost.videos_per_month}
            >
              <Plus className="h-4 w-4" />
              Submit Video
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-card border">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-green-500/10">
                    <DollarSign className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Earned This Month</p>
                    <p className="text-2xl font-bold">${earnedThisMonth.toFixed(0)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-card border">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-blue-500/10">
                    <Video className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Per Video Rate</p>
                    <p className="text-2xl font-bold">${payoutPerVideo.toFixed(2)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-card border">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-green-500/10">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Approved Videos</p>
                    <p className="text-2xl font-bold">{approvedThisMonth}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-card border">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-yellow-500/10">
                    <Clock className="h-5 w-5 text-yellow-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Pending Review</p>
                    <p className="text-2xl font-bold">{pendingThisMonth}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Monthly Progress */}
          <Card className="bg-card border">
            <CardHeader>
              <CardTitle className="text-lg font-inter tracking-[-0.5px]">Monthly Progress</CardTitle>
              <CardDescription>
                {thisMonthSubmissions.length} of {boost.videos_per_month} videos submitted this month
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Progress value={progressPercent} className="h-3" />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Potential earnings: ${boost.monthly_retainer}/month</span>
                <span>
                  {boost.videos_per_month - thisMonthSubmissions.length} videos remaining
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Submissions Table */}
          <Card className="bg-card border">
            <CardHeader>
              <CardTitle className="text-lg font-inter tracking-[-0.5px]">Your Submissions</CardTitle>
              <CardDescription>Videos you've submitted for this boost</CardDescription>
            </CardHeader>
            <CardContent>
              {submissions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Video className="h-12 w-12 mx-auto mb-4 opacity-40" />
                  <p>No videos submitted yet</p>
                  <p className="text-sm">Submit your first video to start earning</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Video</TableHead>
                      <TableHead>Platform</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Payout</TableHead>
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
                            <ExternalLink className="h-4 w-4" />
                            View Video
                          </a>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <img 
                              src={platformIcons[submission.platform.toLowerCase()] || platformIcons.tiktok} 
                              alt={submission.platform} 
                              className="h-5 w-5" 
                            />
                            <span className="capitalize">{submission.platform}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(submission.submitted_at), "MMM d, yyyy")}
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
                        <TableCell className="text-right font-medium">
                          {submission.status === "approved" ? (
                            <span className="text-green-500">+${submission.payout_amount?.toFixed(2)}</span>
                          ) : submission.status === "pending" ? (
                            <span className="text-muted-foreground">${submission.payout_amount?.toFixed(2)}</span>
                          ) : (
                            <span className="text-red-500 line-through">${submission.payout_amount?.toFixed(2)}</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Guidelines */}
          {boost.content_style_requirements && (
            <Card className="bg-card border">
              <CardHeader>
                <CardTitle className="text-lg font-inter tracking-[-0.5px]">Content Requirements</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap">{boost.content_style_requirements}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Submit Video Dialog */}
      <Dialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="font-inter tracking-[-0.5px]">Submit Video</DialogTitle>
            <DialogDescription>
              Submit a video link for approval. You'll earn ${payoutPerVideo.toFixed(2)} when approved.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Video URL</label>
              <Input
                placeholder="https://tiktok.com/@user/video/..."
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Platform</label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tiktok">
                    <div className="flex items-center gap-2">
                      <img src={tiktokLogo} alt="TikTok" className="h-4 w-4" />
                      TikTok
                    </div>
                  </SelectItem>
                  <SelectItem value="instagram">
                    <div className="flex items-center gap-2">
                      <img src={instagramLogo} alt="Instagram" className="h-4 w-4" />
                      Instagram
                    </div>
                  </SelectItem>
                  <SelectItem value="youtube">
                    <div className="flex items-center gap-2">
                      <img src={youtubeLogo} alt="YouTube" className="h-4 w-4" />
                      YouTube
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Notes (optional)</label>
              <Textarea
                placeholder="Any additional notes about this video..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            <div className="bg-muted/30 rounded-lg p-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <AlertCircle className="h-4 w-4" />
                <span>
                  {boost.videos_per_month - thisMonthSubmissions.length} submissions remaining this month
                </span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSubmitDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitVideo} 
              disabled={submitting}
              className="bg-[#2060de] hover:bg-[#1a50c8] text-white border-t border-[#4b85f7]"
            >
              {submitting ? "Submitting..." : "Submit Video"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
