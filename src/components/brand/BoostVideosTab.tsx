import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { Video, Check, X, ExternalLink, ChevronRight, User } from "lucide-react";
import { SubmissionHeatmap } from "./SubmissionHeatmap";
import tiktokLogoWhite from "@/assets/tiktok-logo-white.png";
import tiktokLogoBlack from "@/assets/tiktok-logo-black.png";
import instagramLogoWhite from "@/assets/instagram-logo-white.png";
import instagramLogoBlack from "@/assets/instagram-logo-black.png";
import youtubeLogoWhite from "@/assets/youtube-logo-white.png";
import youtubeLogoBlack from "@/assets/youtube-logo-black.png";
import { useTheme } from "@/components/ThemeProvider";
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
}
interface Profile {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
}
interface CreatorStats {
  userId: string;
  profile: Profile;
  totalSubmissions: number;
  approvedThisMonth: number;
  pendingThisMonth: number;
  earnedThisMonth: number;
  submissions: VideoSubmission[];
}
interface BoostVideosTabProps {
  boostId: string;
  monthlyRetainer: number;
  videosPerMonth: number;
}
export function BoostVideosTab({
  boostId,
  monthlyRetainer,
  videosPerMonth
}: BoostVideosTabProps) {
  const {
    resolvedTheme
  } = useTheme();
  const [submissions, setSubmissions] = useState<VideoSubmission[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<VideoSubmission | null>(null);
  const [selectedCreator, setSelectedCreator] = useState<string | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const [sortBy, setSortBy] = useState<"date" | "status" | "platform">("date");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const payoutPerVideo = monthlyRetainer / videosPerMonth;
  const getPlatformLogo = (platform: string) => {
    const isDark = resolvedTheme === "dark";
    switch (platform.toLowerCase()) {
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
  }, [boostId]);
  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const {
        data: submissionsData,
        error
      } = await supabase.from("boost_video_submissions").select("*").eq("bounty_campaign_id", boostId).order("submitted_at", {
        ascending: false
      });
      if (error) throw error;
      setSubmissions(submissionsData || []);

      // Fetch profiles for all users
      if (submissionsData && submissionsData.length > 0) {
        const userIds = [...new Set(submissionsData.map(s => s.user_id))];
        const {
          data: profilesData
        } = await supabase.from("profiles").select("id, username, full_name, avatar_url").in("id", userIds);
        if (profilesData) {
          const profileMap: Record<string, Profile> = {};
          profilesData.forEach(p => {
            profileMap[p.id] = p;
          });
          setProfiles(profileMap);
        }
      }
    } catch (error) {
      console.error("Error fetching submissions:", error);
    } finally {
      setLoading(false);
    }
  };
  const handleApprove = async (submission: VideoSubmission) => {
    setProcessing(true);
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) return;

      // Update submission status
      const {
        error: updateError
      } = await supabase.from("boost_video_submissions").update({
        status: "approved",
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id
      }).eq("id", submission.id);
      if (updateError) throw updateError;

      // Credit creator's wallet
      const {
        data: wallet
      } = await supabase.from("wallets").select("balance, total_earned").eq("user_id", submission.user_id).single();
      if (wallet) {
        const newBalance = (wallet.balance || 0) + (submission.payout_amount || payoutPerVideo);
        const newTotalEarned = (wallet.total_earned || 0) + (submission.payout_amount || payoutPerVideo);
        await supabase.from("wallets").update({
          balance: newBalance,
          total_earned: newTotalEarned
        }).eq("user_id", submission.user_id);

        // Create transaction record
        await supabase.from("wallet_transactions").insert({
          user_id: submission.user_id,
          amount: submission.payout_amount || payoutPerVideo,
          type: "earning",
          description: "Boost video approved",
          metadata: {
            boost_id: boostId,
            submission_id: submission.id,
            video_url: submission.video_url
          },
          created_by: user.id
        });
      }
      toast.success("Video approved and creator paid!");
      fetchSubmissions();
      setSelectedSubmission(null);
    } catch (error) {
      console.error("Error approving:", error);
      toast.error("Failed to approve video");
    } finally {
      setProcessing(false);
    }
  };
  const handleReject = async () => {
    if (!selectedSubmission) return;
    setProcessing(true);
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) return;
      const {
        error
      } = await supabase.from("boost_video_submissions").update({
        status: "rejected",
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id,
        rejection_reason: rejectionReason.trim() || null
      }).eq("id", selectedSubmission.id);
      if (error) throw error;
      toast.success("Video rejected");
      fetchSubmissions();
      setRejectDialogOpen(false);
      setSelectedSubmission(null);
      setRejectionReason("");
    } catch (error) {
      console.error("Error rejecting:", error);
      toast.error("Failed to reject video");
    } finally {
      setProcessing(false);
    }
  };

  // Group submissions by creator
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const creatorStats: CreatorStats[] = Object.keys(profiles).map(userId => {
    const profile = profiles[userId];
    const userSubmissions = submissions.filter(s => s.user_id === userId);
    const thisMonthSubs = userSubmissions.filter(s => {
      const date = new Date(s.submitted_at);
      return date >= monthStart && date <= monthEnd;
    });
    return {
      userId,
      profile,
      totalSubmissions: userSubmissions.length,
      approvedThisMonth: thisMonthSubs.filter(s => s.status === "approved").length,
      pendingThisMonth: thisMonthSubs.filter(s => s.status === "pending").length,
      earnedThisMonth: thisMonthSubs.filter(s => s.status === "approved").length * payoutPerVideo,
      submissions: userSubmissions
    };
  }).sort((a, b) => b.approvedThisMonth - a.approvedThisMonth);
  const pendingSubmissions = submissions.filter(s => s.status === "pending");
  const totalPaidOut = submissions.filter(s => s.status === "approved").length * payoutPerVideo;
  if (loading) {
    return <div className="space-y-4 p-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>;
  }
  return <div className="h-full flex flex-col overflow-hidden">
      {/* Summary Stats */}
      

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Creator Pots */}
        <div className="w-[340px] flex-shrink-0 border-r border-border overflow-hidden flex flex-col">
          
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-2">
              {creatorStats.length === 0 ? <div className="text-center py-8 text-muted-foreground">
                  <User className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No submissions yet</p>
                </div> : creatorStats.map(creator => {
              const progressPercent = creator.approvedThisMonth / videosPerMonth * 100;
              const isSelected = selectedCreator === creator.userId;
              return <button key={creator.userId} onClick={() => setSelectedCreator(isSelected ? null : creator.userId)} className={`w-full rounded-xl p-4 text-left transition-all ${isSelected ? "bg-primary/10 border border-[#5966f3]" : "bg-card/30 hover:bg-card/50 border border-border/30"}`}>
                      <div className="flex items-center gap-3 mb-3">
                        <Avatar className="h-10 w-10 border border-border/40">
                          <AvatarImage src={creator.profile.avatar_url || undefined} />
                          <AvatarFallback className="text-sm bg-muted/40">
                            {creator.profile.username?.[0]?.toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {creator.profile.full_name || creator.profile.username}
                          </p>
                          <p className="text-xs text-muted-foreground">@{creator.profile.username}</p>
                        </div>
                        <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${isSelected ? 'rotate-90' : ''}`} />
                      </div>
                      
                      {/* Submission Heatmap */}
                      <div className="mt-3">
                        <SubmissionHeatmap submissions={creator.submissions.map(s => ({
                    submitted_at: s.submitted_at,
                    status: s.status
                  }))} />
                      </div>
                    </button>;
            })}
            </div>
          </ScrollArea>
        </div>

        {/* Right: Pending Videos / Creator Videos */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="p-3 border-b border-border space-y-3">
            {/* Header with PFP */}
            <div className="flex items-center gap-2.5">
              {selectedCreator && profiles[selectedCreator] && <Avatar className="h-7 w-7 ring-2 ring-background">
                  <AvatarImage src={profiles[selectedCreator]?.avatar_url || undefined} />
                  <AvatarFallback className="text-xs font-medium bg-muted/60 font-inter tracking-[-0.5px]">
                    {profiles[selectedCreator]?.username?.[0]?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>}
              <h3 className="text-sm font-medium text-foreground font-geist tracking-[-0.5px]">
                {selectedCreator ? `${profiles[selectedCreator]?.full_name || profiles[selectedCreator]?.username}'s Submissions` : "Pending Videos"}
              </h3>
            </div>
            
            {/* Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Status Filter */}
              <div className="flex items-center gap-1 bg-muted/30 rounded-lg p-0.5">
                {(["all", "pending", "approved", "rejected"] as const).map(status => <button key={status} onClick={() => setFilterStatus(status)} className={`px-2 py-1 text-[10px] font-inter tracking-[-0.5px] rounded-md transition-colors ${filterStatus === status ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>)}
              </div>
              
              {/* Sort By */}
              <div className="flex items-center gap-1 ml-auto">
                <span className="text-[10px] text-muted-foreground font-inter tracking-[-0.5px]">Sort:</span>
                <div className="flex items-center gap-0.5 bg-muted/30 rounded-lg p-0.5">
                  {(["date", "status", "platform"] as const).map(sort => <button key={sort} onClick={() => setSortBy(sort)} className={`px-2 py-1 text-[10px] font-inter tracking-[-0.5px] rounded-md transition-colors ${sortBy === sort ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                      {sort.charAt(0).toUpperCase() + sort.slice(1)}
                    </button>)}
                </div>
              </div>
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-2">
              {(() => {
              // Get filtered and sorted submissions
              let filteredSubs = selectedCreator ? submissions.filter(s => s.user_id === selectedCreator) : pendingSubmissions;

              // Apply status filter
              if (filterStatus !== "all") {
                filteredSubs = filteredSubs.filter(s => s.status === filterStatus);
              }

              // Apply sorting
              filteredSubs = [...filteredSubs].sort((a, b) => {
                if (sortBy === "date") {
                  return new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime();
                } else if (sortBy === "status") {
                  const statusOrder = {
                    pending: 0,
                    approved: 1,
                    rejected: 2
                  };
                  return (statusOrder[a.status as keyof typeof statusOrder] || 0) - (statusOrder[b.status as keyof typeof statusOrder] || 0);
                } else if (sortBy === "platform") {
                  return a.platform.localeCompare(b.platform);
                }
                return 0;
              });
              if (filteredSubs.length === 0) {
                return <div className="text-center py-12 text-muted-foreground">
                      <Video className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      <p className="text-sm font-inter tracking-[-0.5px]">
                        {selectedCreator ? "No submissions from this creator" : "No pending videos"}
                      </p>
                    </div>;
              }
              return filteredSubs.map(submission => {
                const profile = profiles[submission.user_id];
                return <div key={submission.id} className="group rounded-xl bg-card/40 border border-border/40 overflow-hidden transition-all hover:border-border/60">
                      {/* Header */}
                      <div className="flex items-center justify-between p-4 border-b border-border/20">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 ring-2 ring-background">
                            <AvatarImage src={profile?.avatar_url || undefined} />
                            <AvatarFallback className="text-xs font-medium bg-muted/60 font-inter tracking-[-0.5px]">
                              {profile?.username?.[0]?.toUpperCase() || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium font-geist tracking-[-0.5px]">
                              {profile?.full_name || profile?.username}
                            </p>
                            <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">
                              {format(new Date(submission.submitted_at), "MMM d, yyyy")}
                            </p>
                          </div>
                        </div>
                        <Badge className={`font-inter tracking-[-0.5px] text-[11px] font-medium ${submission.status === "approved" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : submission.status === "rejected" ? "bg-red-500/10 text-red-500 border-red-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20"}`}>
                          {submission.status}
                        </Badge>
                      </div>

                      {/* Content */}
                      <div className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="h-7 w-7 rounded-lg bg-muted/40 flex items-center justify-center">
                              <img src={getPlatformLogo(submission.platform)} alt={submission.platform} className="h-4 w-4" />
                            </div>
                            <a href={submission.video_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1.5 font-inter tracking-[-0.5px]">
                              <ExternalLink className="h-3.5 w-3.5" />
                              View Video
                            </a>
                          </div>
                          <span className="text-sm font-semibold text-foreground font-geist tracking-[-0.5px]">
                            ${(submission.payout_amount || payoutPerVideo).toFixed(2)}
                          </span>
                        </div>

                        {submission.submission_notes && <p className="text-sm text-muted-foreground bg-muted/20 rounded-lg px-3 py-2 font-inter tracking-[-0.5px]">
                            {submission.submission_notes}
                          </p>}

                        {submission.rejection_reason && <p className="text-sm text-red-400 bg-red-500/5 border border-red-500/10 rounded-lg px-3 py-2 font-inter tracking-[-0.5px]">
                            {submission.rejection_reason}
                          </p>}
                      </div>

                      {/* Actions */}
                      {submission.status === "pending" && <div className="flex border-t border-border/20">
                          <button className="flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium text-red-400 hover:bg-red-500/5 transition-colors font-inter tracking-[-0.5px] disabled:opacity-50" onClick={() => {
                      setSelectedSubmission(submission);
                      setRejectDialogOpen(true);
                    }} disabled={processing}>
                            <X className="h-4 w-4" />
                            Reject
                          </button>
                          <div className="w-px bg-border/20" />
                          <button className="flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium text-emerald-400 hover:bg-emerald-500/5 transition-colors font-inter tracking-[-0.5px] disabled:opacity-50" onClick={() => handleApprove(submission)} disabled={processing}>
                            <Check className="h-4 w-4" />
                            Approve
                          </button>
                        </div>}
                    </div>;
              });
            })()}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Video</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this video (optional)
            </DialogDescription>
          </DialogHeader>
          <Textarea placeholder="Reason for rejection..." value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} rows={3} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={processing}>
              {processing ? "Rejecting..." : "Reject Video"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>;
}