import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, X, ExternalLink, Video, User, DollarSign, Play } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import tiktokLogo from "@/assets/tiktok-logo-white.png";
import instagramLogo from "@/assets/instagram-logo-white.png";
import youtubeLogo from "@/assets/youtube-logo-white.png";

interface VideoSubmission {
  id: string;
  campaign_id: string;
  creator_id: string;
  video_url: string;
  platform: string | null;
  submission_text: string | null;
  status: string;
  estimated_payout: number | null;
  created_at: string;
  profile?: {
    username: string;
    full_name: string | null;
    avatar_url: string | null;
    email: string | null;
  };
}

interface Campaign {
  id: string;
  title: string;
  brand_id: string | null;
  payment_model?: string | null;
  rpm_rate: number;
  post_rate?: number | null;
}

interface VideoSubmissionsTabProps {
  campaign: Campaign;
  onSubmissionReviewed?: () => void;
}

const PLATFORM_LOGOS: Record<string, string> = {
  tiktok: tiktokLogo,
  instagram: instagramLogo,
  youtube: youtubeLogo,
};

export function VideoSubmissionsTab({ campaign, onSubmissionReviewed }: VideoSubmissionsTabProps) {
  const [submissions, setSubmissions] = useState<VideoSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const isPayPerPost = campaign.payment_model === "pay_per_post";
  const payoutAmount = isPayPerPost ? (campaign.post_rate || 0) : 0;

  useEffect(() => {
    fetchSubmissions();
  }, [campaign.id]);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("campaign_videos")
        .select("*")
        .eq("campaign_id", campaign.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch profiles for all creators
      const creatorIds = [...new Set(data?.map((v) => v.creator_id) || [])];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url, email")
        .in("id", creatorIds);

      const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

      const submissionsWithProfiles: VideoSubmission[] =
        data?.map((v) => ({
          ...v,
          profile: profileMap.get(v.creator_id),
        })) || [];

      setSubmissions(submissionsWithProfiles);

      // Auto-select first submission
      if (submissionsWithProfiles.length > 0 && !selectedId) {
        setSelectedId(submissionsWithProfiles[0].id);
      }
    } catch (error) {
      console.error("Error fetching submissions:", error);
      toast.error("Failed to load video submissions");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (submissionId: string, newStatus: "approved" | "rejected") => {
    setProcessing(submissionId);
    try {
      const submission = submissions.find((s) => s.id === submissionId);
      if (!submission) return;

      // Update the video status
      const { error: updateError } = await supabase
        .from("campaign_videos")
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", submissionId);

      if (updateError) throw updateError;

      // If approved and pay_per_post, process payment
      if (newStatus === "approved" && isPayPerPost && payoutAmount > 0) {
        try {
          const { error: paymentError } = await supabase.functions.invoke("create-campaign-payment", {
            body: {
              campaignId: campaign.id,
              creatorId: submission.creator_id,
              amount: payoutAmount,
              videoId: submissionId,
              videoUrl: submission.video_url,
              paymentType: "video_approval",
            },
          });

          if (paymentError) {
            console.error("Payment error:", paymentError);
            toast.error("Video approved but payment failed. Please process manually.");
          } else {
            toast.success(`Video approved! $${payoutAmount.toFixed(2)} paid to creator.`);
          }
        } catch (paymentError) {
          console.error("Payment processing error:", paymentError);
          toast.error("Video approved but payment failed. Please process manually.");
        }
      } else {
        toast.success(`Video ${newStatus}`);
      }

      // Remove from list and select next
      setSubmissions((prev) => prev.filter((s) => s.id !== submissionId));
      const remaining = submissions.filter((s) => s.id !== submissionId);
      if (remaining.length > 0) {
        const currentIndex = submissions.findIndex((s) => s.id === submissionId);
        const nextIndex = Math.min(currentIndex, remaining.length - 1);
        setSelectedId(remaining[nextIndex].id);
      } else {
        setSelectedId(null);
      }

      onSubmissionReviewed?.();
    } catch (error) {
      console.error("Error updating submission:", error);
      toast.error("Failed to update submission");
    } finally {
      setProcessing(null);
    }
  };

  const selectedSubmission = submissions.find((s) => s.id === selectedId);
  const pendingCount = submissions.length;

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-64 col-span-2" />
        </div>
      </div>
    );
  }

  if (submissions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <Video className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-semibold mb-2">No pending video submissions</h3>
        <p className="text-muted-foreground text-sm">
          When creators submit videos for this campaign, they'll appear here for review.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Submissions List - Left Column */}
      <div className="w-80 border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold">Video Submissions</h3>
          <p className="text-sm text-muted-foreground">{pendingCount} pending review</p>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {submissions.map((submission) => (
              <button
                key={submission.id}
                onClick={() => setSelectedId(submission.id)}
                className={`w-full p-3 rounded-lg text-left transition-colors ${
                  selectedId === submission.id
                    ? "bg-primary/10 border border-primary/20"
                    : "hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={submission.profile?.avatar_url || ""} />
                    <AvatarFallback>
                      {submission.profile?.username?.[0]?.toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {submission.profile?.full_name || submission.profile?.username || "Unknown"}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {submission.platform && PLATFORM_LOGOS[submission.platform] && (
                        <img
                          src={PLATFORM_LOGOS[submission.platform]}
                          alt={submission.platform}
                          className="h-3 w-3"
                        />
                      )}
                      <span>
                        {formatDistanceToNow(new Date(submission.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  {isPayPerPost && (
                    <Badge variant="outline" className="text-emerald-500 border-emerald-500/30">
                      ${payoutAmount}
                    </Badge>
                  )}
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Submission Details - Right Column */}
      <div className="flex-1 p-6">
        {selectedSubmission ? (
          <div className="space-y-6">
            {/* Creator Info */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={selectedSubmission.profile?.avatar_url || ""} />
                  <AvatarFallback className="text-xl">
                    {selectedSubmission.profile?.username?.[0]?.toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-xl font-semibold">
                    {selectedSubmission.profile?.full_name ||
                      selectedSubmission.profile?.username ||
                      "Unknown Creator"}
                  </h2>
                  <p className="text-muted-foreground">@{selectedSubmission.profile?.username}</p>
                  {selectedSubmission.profile?.email && (
                    <p className="text-sm text-muted-foreground">
                      {selectedSubmission.profile.email}
                    </p>
                  )}
                </div>
              </div>
              <Badge variant="outline">Pending</Badge>
            </div>

            {/* Video Link */}
            <div className="p-4 rounded-lg bg-muted/30">
              <div className="flex items-center gap-3">
                {selectedSubmission.platform && PLATFORM_LOGOS[selectedSubmission.platform] && (
                  <img
                    src={PLATFORM_LOGOS[selectedSubmission.platform]}
                    alt={selectedSubmission.platform}
                    className="h-6 w-6"
                  />
                )}
                <div className="flex-1">
                  <p className="font-medium capitalize">{selectedSubmission.platform || "Video"}</p>
                  <a
                    href={selectedSubmission.video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline flex items-center gap-1 break-all"
                  >
                    {selectedSubmission.video_url}
                    <ExternalLink className="h-3 w-3 flex-shrink-0" />
                  </a>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={selectedSubmission.video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Watch
                  </a>
                </Button>
              </div>
            </div>

            {/* Submission Notes */}
            {selectedSubmission.submission_text && (
              <div className="space-y-2">
                <h3 className="font-semibold">Creator's Notes</h3>
                <p className="text-sm text-muted-foreground p-4 rounded-lg bg-muted/30">
                  {selectedSubmission.submission_text}
                </p>
              </div>
            )}

            {/* Payout Info for Pay Per Post */}
            {isPayPerPost && (
              <div className="flex items-center justify-between p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-emerald-500" />
                  <span className="font-medium">Payout on Approval</span>
                </div>
                <span className="text-xl font-bold text-emerald-500">
                  ${payoutAmount.toFixed(2)}
                </span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                onClick={() => handleUpdateStatus(selectedSubmission.id, "rejected")}
                variant="outline"
                disabled={processing === selectedSubmission.id}
                className="flex-1"
              >
                <X className="h-4 w-4 mr-2" />
                Reject
              </Button>
              <Button
                onClick={() => handleUpdateStatus(selectedSubmission.id, "approved")}
                disabled={processing === selectedSubmission.id}
                className="flex-1"
              >
                <Check className="h-4 w-4 mr-2" />
                {isPayPerPost ? `Approve & Pay $${payoutAmount.toFixed(2)}` : "Approve"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Select a submission to review
          </div>
        )}
      </div>
    </div>
  );
}
