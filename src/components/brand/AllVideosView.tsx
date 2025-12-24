import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Check, X, ExternalLink, Video, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { useTheme } from "@/components/ThemeProvider";
import tiktokLogoWhite from "@/assets/tiktok-logo-white.png";
import tiktokLogoBlack from "@/assets/tiktok-logo-black.png";
import instagramLogoWhite from "@/assets/instagram-logo-white.png";
import instagramLogoBlack from "@/assets/instagram-logo-black.png";
import youtubeLogoWhite from "@/assets/youtube-logo-white.png";
import youtubeLogoBlack from "@/assets/youtube-logo-black.png";
import videoLibraryIcon from "@/assets/video-library-icon.svg";

interface VideoSubmission {
  id: string;
  user_id: string;
  video_url: string;
  platform: string;
  submission_notes: string | null;
  status: string;
  payout_amount: number | null;
  submitted_at: string;
  reviewed_at: string | null;
  rejection_reason: string | null;
  campaign_id: string;
  campaign_title?: string;
}

interface Profile {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  email?: string | null;
}

interface AllVideosViewProps {
  brandId: string;
  onSubmissionReviewed?: () => void;
}

export function AllVideosView({ brandId, onSubmissionReviewed }: AllVideosViewProps) {
  const { resolvedTheme } = useTheme();
  const [submissions, setSubmissions] = useState<VideoSubmission[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [campaigns, setCampaigns] = useState<Record<string, { title: string; rpm_rate: number; post_rate: number | null; payment_model: string | null }>>({});
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<VideoSubmission | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "approved" | "rejected">("all");

  const getPlatformLogo = (platform: string) => {
    const isDark = resolvedTheme === "dark";
    switch (platform?.toLowerCase()) {
      case "tiktok":
        return isDark ? tiktokLogoWhite : tiktokLogoBlack;
      case "instagram":
        return isDark ? instagramLogoWhite : instagramLogoBlack;
      case "youtube":
        return isDark ? youtubeLogoWhite : youtubeLogoBlack;
      default:
        return isDark ? tiktokLogoWhite : tiktokLogoBlack;
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [brandId]);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      // Fetch all campaigns for this brand
      const { data: campaignsData } = await supabase
        .from("campaigns")
        .select("id, title, rpm_rate, post_rate, payment_model")
        .eq("brand_id", brandId);

      const campaignIds = campaignsData?.map(c => c.id) || [];
      const campaignMap: Record<string, { title: string; rpm_rate: number; post_rate: number | null; payment_model: string | null }> = {};
      campaignsData?.forEach(c => {
        campaignMap[c.id] = { title: c.title, rpm_rate: c.rpm_rate, post_rate: c.post_rate, payment_model: c.payment_model };
      });
      setCampaigns(campaignMap);

      if (campaignIds.length === 0) {
        setSubmissions([]);
        setLoading(false);
        return;
      }

      // Fetch all video submissions across all campaigns
      const { data, error } = await supabase
        .from("campaign_videos")
        .select("*")
        .in("campaign_id", campaignIds)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Normalize to common structure
      const submissionsData: VideoSubmission[] = (data || []).map(v => ({
        id: v.id,
        user_id: v.creator_id,
        video_url: v.video_url,
        platform: v.platform || "unknown",
        submission_notes: v.submission_text,
        status: v.status || "pending",
        payout_amount: v.estimated_payout,
        submitted_at: v.created_at,
        reviewed_at: v.updated_at,
        rejection_reason: null,
        campaign_id: v.campaign_id,
        campaign_title: campaignMap[v.campaign_id]?.title,
      }));

      setSubmissions(submissionsData);

      // Fetch profiles
      if (submissionsData.length > 0) {
        const userIds = [...new Set(submissionsData.map(s => s.user_id))];
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, username, full_name, avatar_url, email")
          .in("id", userIds);

        if (profilesData) {
          const profileMap: Record<string, Profile> = {};
          profilesData.forEach(p => {
            profileMap[p.id] = p;
          });
          setProfiles(profileMap);
        }
      }
    } catch (error) {
      console.error("Error fetching video submissions:", error);
      toast.error("Failed to load video submissions");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (submission: VideoSubmission) => {
    setProcessing(true);
    try {
      const { error } = await supabase
        .from("campaign_videos")
        .update({ status: "approved", updated_at: new Date().toISOString() })
        .eq("id", submission.id);

      if (error) throw error;

      setSubmissions(prev => prev.map(s => 
        s.id === submission.id ? { ...s, status: "approved" } : s
      ));
      setSelectedSubmission(null);
      onSubmissionReviewed?.();
      toast.success("Video approved");
    } catch (error) {
      console.error("Error approving video:", error);
      toast.error("Failed to approve video");
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedSubmission) return;
    setProcessing(true);
    try {
      const { error } = await supabase
        .from("campaign_videos")
        .update({ 
          status: "rejected", 
          updated_at: new Date().toISOString()
        })
        .eq("id", selectedSubmission.id);

      if (error) throw error;

      setSubmissions(prev => prev.map(s => 
        s.id === selectedSubmission.id ? { ...s, status: "rejected", rejection_reason: rejectionReason } : s
      ));
      setRejectDialogOpen(false);
      setRejectionReason("");
      setSelectedSubmission(null);
      onSubmissionReviewed?.();
      toast.success("Video rejected");
    } catch (error) {
      console.error("Error rejecting video:", error);
      toast.error("Failed to reject video");
    } finally {
      setProcessing(false);
    }
  };

  const filteredSubmissions = submissions.filter(s => 
    filterStatus === "all" || s.status === filterStatus
  );

  const pendingCount = submissions.filter(s => s.status === "pending").length;
  const approvedCount = submissions.filter(s => s.status === "approved").length;

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-8 w-20 rounded-full" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (submissions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <img src={videoLibraryIcon} alt="" className="h-12 w-12 opacity-50 mb-4" />
        <h3 className="text-lg font-semibold mb-2">No video submissions</h3>
        <p className="text-muted-foreground text-sm">
          When creators submit videos to your campaigns, they'll appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Filter tabs */}
      <div className="flex items-center gap-1 border-b border-border pb-2">
        {(["all", "pending", "approved", "rejected"] as const).map(status => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors capitalize ${
              filterStatus === status
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            {status}
            {status === "pending" && pendingCount > 0 && (
              <span className="ml-1.5 text-xs bg-amber-500/20 text-amber-500 px-1.5 py-0.5 rounded-full">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Submissions grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSubmissions.map(submission => {
          const profile = profiles[submission.user_id];
          return (
            <div
              key={submission.id}
              className="border border-border rounded-xl overflow-hidden bg-card/50 hover:bg-card transition-colors"
            >
              <div className="p-4 space-y-3">
                {/* Creator info */}
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={profile?.avatar_url || ""} />
                    <AvatarFallback>
                      {profile?.username?.[0]?.toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {profile?.full_name || profile?.username || "Unknown"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {submission.campaign_title}
                    </p>
                  </div>
                  <img
                    src={getPlatformLogo(submission.platform)}
                    alt={submission.platform}
                    className="h-5 w-5 opacity-60"
                  />
                </div>

                {/* Video link */}
                <a
                  href={submission.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-primary hover:underline truncate"
                >
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{submission.video_url}</span>
                </a>

                {/* Status and time */}
                <div className="flex items-center justify-between">
                  <Badge
                    className={
                      submission.status === "approved"
                        ? "bg-emerald-500/10 text-emerald-500"
                        : submission.status === "rejected"
                        ? "bg-red-500/10 text-red-500"
                        : "bg-amber-500/10 text-amber-500"
                    }
                  >
                    {submission.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(submission.submitted_at), { addSuffix: true })}
                  </span>
                </div>

                {/* Actions for pending */}
                {submission.status === "pending" && (
                  <div className="flex items-center gap-2 pt-2 border-t border-border">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1"
                      onClick={() => {
                        setSelectedSubmission(submission);
                        setRejectDialogOpen(true);
                      }}
                    >
                      <X className="h-3.5 w-3.5" />
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 gap-1"
                      onClick={() => handleApprove(submission)}
                      disabled={processing}
                    >
                      <Check className="h-3.5 w-3.5" />
                      Approve
                    </Button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Video Submission</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this video (optional).
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason for rejection..."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={processing}
            >
              Reject Video
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
