import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Check, X, DollarSign, ChevronRight, Search, CalendarDays, Clock, RotateCcw, LayoutGrid, TableIcon, ChevronDown, RefreshCw } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { isSameDay, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { toast } from "sonner";
import { format, formatDistanceToNow, startOfMonth, endOfMonth } from "date-fns";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";
import { useTheme } from "@/components/ThemeProvider";
import { SubmissionHeatmap } from "./SubmissionHeatmap";
import tiktokLogoWhite from "@/assets/tiktok-logo-white.png";
import tiktokLogoBlack from "@/assets/tiktok-logo-black.png";
import instagramLogoWhite from "@/assets/instagram-logo-white.png";
import instagramLogoBlack from "@/assets/instagram-logo-black.png";
import youtubeLogoWhite from "@/assets/youtube-logo-white.png";
import youtubeLogoBlack from "@/assets/youtube-logo-black.png";
import videoLibraryIcon from "@/assets/video-library-icon.svg";
import flagIcon from "@/assets/flag-icon.svg";
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
  is_flagged: boolean | null;
  video_description: string | null;
  video_thumbnail_url: string | null;
  video_author_username: string | null;
  video_author_avatar: string | null;
  video_title: string | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
}
interface Profile {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  email?: string | null;
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

// Unified props interface for both campaigns and boosts
interface VideoSubmissionsTabProps {
  // For campaigns
  campaign?: {
    id: string;
    title: string;
    brand_id: string | null;
    payment_model?: string | null;
    rpm_rate: number;
    post_rate?: number | null;
  };
  // For boosts
  boostId?: string;
  monthlyRetainer?: number;
  videosPerMonth?: number;
  onSubmissionReviewed?: () => void;
}
export function VideoSubmissionsTab({
  campaign,
  boostId,
  monthlyRetainer = 0,
  videosPerMonth = 1,
  onSubmissionReviewed
}: VideoSubmissionsTabProps) {
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
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "approved" | "rejected" | "flagged">("all");
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [selectedDateFilter, setSelectedDateFilter] = useState<Date | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  // Determine if this is a boost or campaign
  const isBoost = !!boostId;
  const entityId = isBoost ? boostId : campaign?.id;

  // Calculate payout amount based on payment model
  const getPayoutForSubmission = (submission: VideoSubmission) => {
    // If payout_amount is already set, use it
    if (submission.payout_amount !== null && submission.payout_amount !== undefined) {
      return submission.payout_amount;
    }

    // For boosts, calculate based on monthly retainer / videos per month
    if (isBoost) {
      return monthlyRetainer / videosPerMonth;
    }

    // For campaigns
    if (campaign?.payment_model === "pay_per_post") {
      return campaign?.post_rate || 0;
    }

    // For RPM-based campaigns, calculate based on views
    if (campaign?.rpm_rate && submission.views) {
      return submission.views / 1000 * campaign.rpm_rate;
    }
    return 0;
  };
  const payoutPerVideo = isBoost ? monthlyRetainer / videosPerMonth : campaign?.payment_model === "pay_per_post" ? campaign?.post_rate || 0 : 0;
  const isPayPerPost = isBoost || campaign?.payment_model === "pay_per_post";
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
    if (entityId) {
      fetchSubmissions();
    }
  }, [entityId]);
  const fetchSubmissions = async () => {
    if (!entityId) return;
    setLoading(true);
    try {
      // Fetch from unified video_submissions table
      const {
        data,
        error
      } = await supabase.from("video_submissions").select("*").eq("source_type", isBoost ? "boost" : "campaign").eq("source_id", entityId).order("submitted_at", {
        ascending: false
      });
      if (error) throw error;

      // Map to the expected format
      const submissionsData: VideoSubmission[] = (data || []).map(v => ({
        id: v.id,
        user_id: v.creator_id,
        video_url: v.video_url,
        platform: v.platform || "unknown",
        submission_notes: v.submission_notes,
        status: v.status || "pending",
        payout_amount: v.payout_amount,
        submitted_at: v.submitted_at,
        reviewed_at: v.reviewed_at,
        rejection_reason: v.rejection_reason,
        is_flagged: v.is_flagged,
        video_description: v.video_description,
        video_thumbnail_url: v.video_thumbnail_url,
        video_author_username: v.video_author_username,
        video_author_avatar: v.video_author_avatar,
        video_title: v.video_title,
        views: v.views,
        likes: v.likes,
        comments: v.comments,
        shares: v.shares
      }));
      setSubmissions(submissionsData);

      // Fetch profiles for all users
      if (submissionsData.length > 0) {
        const userIds = [...new Set(submissionsData.map(s => s.user_id))];
        const {
          data: profilesData
        } = await supabase.from("profiles").select("id, username, full_name, avatar_url, email").in("id", userIds);
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
      toast.error("Failed to load video submissions");
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

      // Optimistic update
      setSubmissions(prev => prev.map(s => s.id === submission.id ? {
        ...s,
        status: "approved",
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id
      } : s));

      // Update unified video_submissions table
      const {
        error: updateError
      } = await supabase.from("video_submissions").update({
        status: "approved",
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id
      }).eq("id", submission.id);
      if (updateError) {
        // Revert on error
        setSubmissions(prev => prev.map(s => s.id === submission.id ? {
          ...s,
          status: "pending",
          reviewed_at: null,
          reviewed_by: null
        } : s));
        throw updateError;
      }
      if (isBoost) {
        // Credit creator's wallet for boost
        const {
          data: wallet
        } = await supabase.from("wallets").select("balance, total_earned").eq("user_id", submission.user_id).single();
        if (wallet) {
          const payout = submission.payout_amount || payoutPerVideo;
          const newBalance = (wallet.balance || 0) + payout;
          const newTotalEarned = (wallet.total_earned || 0) + payout;
          await supabase.from("wallets").update({
            balance: newBalance,
            total_earned: newTotalEarned
          }).eq("user_id", submission.user_id);

          // Create transaction record
          await supabase.from("wallet_transactions").insert({
            user_id: submission.user_id,
            amount: payout,
            type: "earning",
            description: "Boost video approved",
            metadata: {
              boost_id: entityId,
              submission_id: submission.id,
              video_url: submission.video_url
            },
            created_by: user.id
          });
        }
      } else {
        // If pay_per_post, process payment for campaign
        if (isPayPerPost && payoutPerVideo > 0) {
          try {
            const {
              error: paymentError
            } = await supabase.functions.invoke("create-campaign-payment", {
              body: {
                campaign_id: entityId,
                user_id: submission.user_id,
                amount: payoutPerVideo,
                description: `Video approved: ${submission.video_url}`,
                platform: submission.platform
              }
            });
            if (paymentError) {
              console.error("Payment error:", paymentError);
              toast.error("Video approved but payment failed. Please process manually.");
            }
          } catch (paymentError) {
            console.error("Payment processing error:", paymentError);
            toast.error("Video approved but payment failed. Please process manually.");
          }
        }
      }

      // Track video on Shortimize (fire and forget - don't block approval)
      try {
        const {
          data: trackResult,
          error: trackError
        } = await supabase.functions.invoke("track-shortimize-video", {
          body: {
            videoUrl: submission.video_url,
            campaignId: isBoost ? undefined : entityId,
            boostId: isBoost ? entityId : undefined,
            submissionId: submission.id,
            isBoost
          }
        });
        if (trackError) {
          console.error("Shortimize tracking error:", trackError);
        } else if (trackResult?.success) {
          console.log("Video tracked on Shortimize:", trackResult);
          if (!trackResult.skipped && !trackResult.alreadyTracked) {
            toast.success("Video tracked on Shortimize", {
              duration: 2000
            });
          }
        } else if (trackResult?.skipped) {
          console.log("Shortimize tracking skipped:", trackResult.message);
        }
      } catch (trackError) {
        console.error("Shortimize tracking failed:", trackError);
        // Don't show error to user - tracking failure shouldn't affect approval
      }
      toast.success(isPayPerPost ? `Video approved! $${payoutPerVideo.toFixed(2)} paid to creator.` : "Video approved!");
      setSelectedSubmission(null);
      onSubmissionReviewed?.();
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

      // Optimistic update
      setSubmissions(prev => prev.map(s => s.id === selectedSubmission.id ? {
        ...s,
        status: "rejected",
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id,
        rejection_reason: rejectionReason.trim() || null
      } : s));

      // Update unified video_submissions table
      const {
        error
      } = await supabase.from("video_submissions").update({
        status: "rejected",
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id,
        rejection_reason: rejectionReason.trim() || null
      }).eq("id", selectedSubmission.id);
      if (error) {
        // Revert on error
        setSubmissions(prev => prev.map(s => s.id === selectedSubmission.id ? {
          ...s,
          status: "pending",
          reviewed_at: null,
          reviewed_by: null,
          rejection_reason: null
        } : s));
        throw error;
      }
      toast.success("Video rejected");
      setRejectDialogOpen(false);
      setSelectedSubmission(null);
      setRejectionReason("");
      onSubmissionReviewed?.();
    } catch (error) {
      console.error("Error rejecting:", error);
      toast.error("Failed to reject video");
    } finally {
      setProcessing(false);
    }
  };
  const handleFlag = async (submission: VideoSubmission) => {
    setProcessing(true);
    try {
      const newFlagState = !submission.is_flagged;

      // Optimistic update
      setSubmissions(prev => prev.map(s => s.id === submission.id ? {
        ...s,
        is_flagged: newFlagState
      } : s));

      // Update unified video_submissions table
      const {
        error
      } = await supabase.from("video_submissions").update({
        is_flagged: newFlagState,
        updated_at: new Date().toISOString()
      }).eq("id", submission.id);
      if (error) {
        // Revert on error
        setSubmissions(prev => prev.map(s => s.id === submission.id ? {
          ...s,
          is_flagged: !newFlagState
        } : s));
        throw error;
      }
      toast.success(newFlagState ? "Submission flagged" : "Flag removed");
    } catch (error) {
      console.error("Error flagging:", error);
      toast.error("Failed to flag submission");
    } finally {
      setProcessing(false);
    }
  };
  const handleRevertApproval = async (submission: VideoSubmission) => {
    setProcessing(true);
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) return;

      // Optimistic update
      setSubmissions(prev => prev.map(s => s.id === submission.id ? {
        ...s,
        status: "pending",
        reviewed_at: null,
        reviewed_by: null
      } : s));

      // Update status back to pending
      const {
        error
      } = await supabase.from("video_submissions").update({
        status: "pending",
        reviewed_at: null,
        reviewed_by: null,
        updated_at: new Date().toISOString()
      }).eq("id", submission.id);
      if (error) {
        // Revert on error
        setSubmissions(prev => prev.map(s => s.id === submission.id ? {
          ...s,
          status: "approved"
        } : s));
        throw error;
      }
      toast.success("Approval reverted to pending");
      onSubmissionReviewed?.();
    } catch (error) {
      console.error("Error reverting approval:", error);
      toast.error("Failed to revert approval");
    } finally {
      setProcessing(false);
    }
  };

  // Handle refreshing video metadata
  const handleRefreshMetadata = async (submission: VideoSubmission) => {
    setProcessing(true);
    try {
      let videoDetails = null;
      const url = submission.video_url;

      // Determine which API to call based on platform
      if (url.includes('tiktok.com')) {
        const { data, error } = await supabase.functions.invoke('fetch-tiktok-video', {
          body: { videoUrl: url }
        });
        if (error) throw error;
        videoDetails = data?.data || null;
      } else if (url.includes('instagram.com')) {
        const { data, error } = await supabase.functions.invoke('fetch-instagram-post', {
          body: { postUrl: url }
        });
        if (error) throw error;
        videoDetails = data?.data || null;
      } else if (url.includes('youtube.com') || url.includes('youtu.be')) {
        const { data, error } = await supabase.functions.invoke('fetch-youtube-video', {
          body: { videoUrl: url }
        });
        if (error) throw error;
        if (data) {
          videoDetails = {
            description: data.title || data.description,
            coverUrl: data.thumbnail_url,
            authorUsername: data.author_username,
            authorAvatar: data.author_avatar,
            uploadDate: data.published_date,
            views: data.view_count,
            likes: data.like_count,
            comments: 0,
            shares: 0,
          };
        }
      }

      if (!videoDetails) {
        toast.error("Could not fetch video metadata. The video may be private or unavailable.");
        return;
      }

      // Update the submission in the database
      const { error } = await supabase.from("video_submissions").update({
        views: videoDetails.views || 0,
        likes: videoDetails.likes || 0,
        comments: videoDetails.comments || 0,
        shares: videoDetails.shares || 0,
        video_description: videoDetails.description || null,
        video_thumbnail_url: videoDetails.coverUrl || null,
        video_author_username: videoDetails.authorUsername || null,
        video_author_avatar: videoDetails.authorAvatar || null,
        video_title: videoDetails.title || null,
        updated_at: new Date().toISOString()
      }).eq("id", submission.id);

      if (error) throw error;

      // Update local state
      setSubmissions(prev => prev.map(s => s.id === submission.id ? {
        ...s,
        views: videoDetails.views || 0,
        likes: videoDetails.likes || 0,
        comments: videoDetails.comments || 0,
        shares: videoDetails.shares || 0,
        video_description: videoDetails.description || null,
        video_thumbnail_url: videoDetails.coverUrl || null,
        video_author_username: videoDetails.authorUsername || null,
        video_author_avatar: videoDetails.authorAvatar || null,
        video_title: videoDetails.title || null,
      } : s));

      toast.success("Video metadata refreshed!");
    } catch (error) {
      console.error("Error refreshing metadata:", error);
      toast.error("Failed to refresh video metadata");
    } finally {
      setProcessing(false);
    }
  };

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
  if (loading) {
    return <div className="h-full flex flex-col overflow-hidden">
        <div className="flex-1 flex overflow-hidden">
          <div className="w-[340px] flex-shrink-0 border-r border-border p-4 space-y-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
          </div>
          <div className="flex-1 p-6 space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>;
  }
  return <div className="h-full flex flex-col overflow-hidden">
      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Creator List */}
        <div className="w-[340px] flex-shrink-0 border-r border-border overflow-hidden flex flex-col">
          {/* Header with title and search */}
          <div className="p-3 border-b space-y-2 border-[#141414]/0 py-[6px]">
            
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Search users..." value={userSearchQuery} onChange={e => setUserSearchQuery(e.target.value)} className="h-8 pl-8 text-sm font-inter tracking-[-0.5px]" />
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-2">
              {(() => {
              const filteredCreators = creatorStats.filter(creator => {
                if (!userSearchQuery.trim()) return true;
                const query = userSearchQuery.toLowerCase();
                return creator.profile.username?.toLowerCase().includes(query) || creator.profile.full_name?.toLowerCase().includes(query) || creator.profile.email?.toLowerCase().includes(query);
              });
              if (filteredCreators.length === 0) {
                return <div className="text-center py-8 text-muted-foreground">
                      
                      
                    </div>;
              }
              return filteredCreators.map(creator => {
                const isSelected = selectedCreator === creator.userId;
                return <button key={creator.userId} onClick={() => setSelectedCreator(isSelected ? null : creator.userId)} className="w-full rounded-xl p-4 text-left transition-all bg-card/30 hover:bg-card/50 border border-border/30">
                      <div className="flex items-center gap-3 mb-3">
                        <Avatar className="h-10 w-10 border border-border/40">
                          <AvatarImage src={creator.profile.avatar_url || undefined} />
                          <AvatarFallback className="text-sm bg-muted/40">
                            {creator.profile.username?.[0]?.toUpperCase() || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {creator.profile.full_name || creator.profile.username}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            @{creator.profile.username}
                          </p>
                        </div>
                        <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${isSelected ? "rotate-90" : ""}`} />
                      </div>

                      {/* Submission Heatmap */}
                      <div className="mt-3">
                        <SubmissionHeatmap submissions={creator.submissions.map(s => ({
                      submitted_at: s.submitted_at,
                      status: s.status
                    }))} onDateClick={date => {
                      setSelectedCreator(creator.userId);
                      setSelectedDateFilter(prev => prev && isSameDay(prev, date) ? null : date);
                    }} selectedDate={selectedCreator === creator.userId ? selectedDateFilter : null} />
                      </div>
                    </button>;
              });
            })()}
            </div>
          </ScrollArea>
        </div>

        {/* Right: Pending Videos / Creator Videos */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="p-2.5 border-b border-border space-y-2 py-[8px]">
            {/* Header */}
            <div className="flex items-center gap-2.5 h-8">
              {selectedCreator && profiles[selectedCreator] && <Avatar className="h-7 w-7 ring-2 ring-background shrink-0">
                  <AvatarImage src={profiles[selectedCreator]?.avatar_url || undefined} />
                  <AvatarFallback className="text-xs font-medium bg-muted/60">
                    {profiles[selectedCreator]?.username?.[0]?.toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>}
              <h3 className="text-sm font-medium text-foreground tracking-[-0.5px]">
                {selectedCreator ? `${profiles[selectedCreator]?.full_name || profiles[selectedCreator]?.username}'s Submissions` : "Pending Videos"}
              </h3>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Status Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1 bg-muted/30 rounded-lg px-2 py-1 text-[10px] tracking-[-0.5px] transition-colors">
                    <span className={filterStatus === "all" ? "text-muted-foreground" : "text-foreground"}>
                      {filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1)}
                    </span>
                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="bg-background border border-[#0e0e0e] min-w-[100px]">
                  {(["all", "pending", "approved", "rejected", "flagged"] as const).map(status => (
                    <DropdownMenuItem 
                      key={status} 
                      onClick={() => setFilterStatus(status)}
                      className={`text-[10px] tracking-[-0.5px] cursor-pointer ${filterStatus === status ? "bg-muted/50 text-foreground" : "text-muted-foreground"}`}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* View Toggle */}
              <div className="flex items-center gap-0.5 bg-muted/30 rounded-lg p-0.5">
                <button
                  onClick={() => setViewMode("cards")}
                  className={`p-1.5 rounded-md transition-colors ${viewMode === "cards" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                  title="Card view"
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setViewMode("table")}
                  className={`p-1.5 rounded-md transition-colors ${viewMode === "table" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                  title="Table view"
                >
                  <TableIcon className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Date Range Picker */}
              <div className="flex items-center gap-2 ml-auto">
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 text-[11px] font-inter tracking-[-0.5px] rounded-lg border transition-all duration-200",
                        dateRange?.from
                          ? "bg-primary/10 text-primary border-primary/30 hover:bg-primary/15"
                          : "bg-muted/30 text-muted-foreground border-transparent hover:bg-muted/50 hover:text-foreground"
                      )}
                    >
                      <CalendarDays className="h-3.5 w-3.5" />
                      {dateRange?.from ? (
                        dateRange.to ? (
                          <span>
                            {format(dateRange.from, "MMM d")} – {format(dateRange.to, "MMM d")}
                          </span>
                        ) : (
                          <span>{format(dateRange.from, "MMM d, yyyy")}</span>
                        )
                      ) : (
                        <span>Date Range</span>
                      )}
                      {dateRange?.from && (
                        <X
                          className="h-3 w-3 ml-0.5 hover:text-destructive transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDateRange(undefined);
                            setSelectedDateFilter(null);
                          }}
                        />
                      )}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end" sideOffset={8}>
                    <div className="p-3 border-b border-border">
                      <p className="text-xs font-medium font-inter tracking-[-0.5px] text-foreground">Select date range</p>
                      <p className="text-[10px] text-muted-foreground tracking-[-0.5px] mt-0.5">Filter submissions by date</p>
                    </div>
                    <Calendar
                      mode="range"
                      defaultMonth={dateRange?.from}
                      selected={dateRange}
                      onSelect={(range) => {
                        setDateRange(range);
                        setSelectedDateFilter(null);
                      }}
                      numberOfMonths={2}
                      className={cn("p-3 pointer-events-auto")}
                    />
                    <div className="p-3 border-t border-border flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        {[
                          { label: "Today", days: 0 },
                          { label: "7d", days: 7 },
                          { label: "30d", days: 30 },
                        ].map(({ label, days }) => (
                          <button
                            key={label}
                            onClick={() => {
                              const end = new Date();
                              const start = new Date();
                              start.setDate(start.getDate() - days);
                              setDateRange({ from: start, to: end });
                            }}
                            className="px-2 py-1 text-[10px] font-inter tracking-[-0.5px] rounded-md bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                      {dateRange?.from && (
                        <button
                          onClick={() => {
                            setDateRange(undefined);
                            setSelectedDateFilter(null);
                          }}
                          className="text-[10px] font-inter tracking-[-0.5px] text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-3 space-y-2">
              {(() => {
              // Get filtered and sorted submissions
              let filteredSubs = selectedCreator ? submissions.filter(s => s.user_id === selectedCreator) : submissions;

              // Apply status filter
              if (filterStatus === "flagged") {
                filteredSubs = filteredSubs.filter(s => s.is_flagged === true);
              } else if (filterStatus !== "all") {
                filteredSubs = filteredSubs.filter(s => s.status === filterStatus);
              }

              // Apply date filter (single date or range)
              if (selectedDateFilter) {
                filteredSubs = filteredSubs.filter(s => isSameDay(new Date(s.submitted_at), selectedDateFilter));
              } else if (dateRange?.from) {
                filteredSubs = filteredSubs.filter(s => {
                  const submissionDate = new Date(s.submitted_at);
                  if (dateRange.to) {
                    return isWithinInterval(submissionDate, {
                      start: startOfDay(dateRange.from!),
                      end: endOfDay(dateRange.to)
                    });
                  }
                  return isSameDay(submissionDate, dateRange.from!);
                });
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
                  return (a.platform || "").localeCompare(b.platform || "");
                }
                return 0;
              });
              if (filteredSubs.length === 0) {
                return <div className="text-center py-12 text-muted-foreground">
                      
                      <p className="text-sm tracking-[-0.5px]">
                        No submissions found for the applied filter
                      </p>
                    </div>;
              }
              const formatNumber = (num: number | null | undefined) => {
                if (num === null || num === undefined) return '—';
                if (num === 0) return '0';
                if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
                if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
                return num.toString();
              };

              // Table View
              if (viewMode === "table") {
                return (
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-border/40">
                        <TableHead className="text-[10px] font-medium tracking-[-0.5px] text-muted-foreground">Title</TableHead>
                        <TableHead className="text-[10px] font-medium tracking-[-0.5px] text-muted-foreground">Account</TableHead>
                        <TableHead className="text-[10px] font-medium tracking-[-0.5px] text-muted-foreground">Status</TableHead>
                        <TableHead className="text-[10px] font-medium tracking-[-0.5px] text-muted-foreground">Status</TableHead>
                        <TableHead className="text-[10px] font-medium tracking-[-0.5px] text-muted-foreground text-right">Views</TableHead>
                        <TableHead className="text-[10px] font-medium tracking-[-0.5px] text-muted-foreground text-right">Likes</TableHead>
                        <TableHead className="text-[10px] font-medium tracking-[-0.5px] text-muted-foreground text-right">Comments</TableHead>
                        <TableHead className="text-[10px] font-medium tracking-[-0.5px] text-muted-foreground text-right">Payout</TableHead>
                        <TableHead className="text-[10px] font-medium tracking-[-0.5px] text-muted-foreground">Submitted</TableHead>
                        <TableHead className="text-[10px] font-medium tracking-[-0.5px] text-muted-foreground text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSubs.map(submission => {
                        const profile = profiles[submission.user_id];
                        return (
                          <TableRow key={submission.id} className="border-[#0e0e0e]">
                            <TableCell className="max-w-[200px]">
                              <a 
                                href={submission.video_url} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-xs font-medium tracking-[-0.3px] line-clamp-1 hover:underline"
                              >
                                {submission.video_title || submission.video_description || "Untitled Video"}
                              </a>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                <div className="h-5 w-5 rounded-full bg-muted/50 flex items-center justify-center flex-shrink-0">
                                  <img src={getPlatformLogo(submission.platform)} alt={submission.platform} className="h-3 w-3" />
                                </div>
                                <span className="text-xs text-white">
                                  {submission.video_author_username || profile?.username}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                submission.status === "approved" 
                                  ? "bg-emerald-500/10 text-emerald-500" 
                                  : submission.status === "rejected" 
                                    ? "bg-red-500/10 text-red-500" 
                                    : "bg-amber-500/10 text-amber-500"
                              }`}>
                                {submission.status === "approved" && <Check className="h-3 w-3" />}
                                {submission.status === "rejected" && <X className="h-3 w-3" />}
                                {submission.status === "pending" && <Clock className="h-3 w-3" />}
                                {submission.status}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="text-xs font-medium tabular-nums">{formatNumber(submission.views)}</span>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="text-xs font-medium tabular-nums">{formatNumber(submission.likes)}</span>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="text-xs font-medium tabular-nums">{formatNumber(submission.comments)}</span>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="text-xs font-semibold tabular-nums">${getPayoutForSubmission(submission).toFixed(2)}</span>
                            </TableCell>
                            <TableCell>
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(submission.submitted_at), { addSuffix: true })}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-center gap-1">
                                {submission.status === "pending" && (
                                  <>
                                    <button
                                      className="p-1 rounded hover:bg-red-500/10 text-red-400 transition-colors disabled:opacity-50"
                                      onClick={() => {
                                        setSelectedSubmission(submission);
                                        setRejectDialogOpen(true);
                                      }}
                                      disabled={processing}
                                      title="Reject"
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      className={`p-1 rounded transition-colors disabled:opacity-50 ${
                                        submission.is_flagged ? "bg-orange-500/10 text-orange-400" : "hover:bg-orange-500/10 text-orange-400"
                                      }`}
                                      onClick={() => handleFlag(submission)}
                                      disabled={processing}
                                      title={submission.is_flagged ? "Flagged" : "Flag"}
                                    >
                                      <img alt="" className="h-3.5 w-3.5" src={flagIcon} />
                                    </button>
                                    <button
                                      className="p-1 rounded hover:bg-emerald-500/10 text-emerald-400 transition-colors disabled:opacity-50"
                                      onClick={() => handleApprove(submission)}
                                      disabled={processing}
                                      title="Approve"
                                    >
                                      <Check className="h-3.5 w-3.5" />
                                    </button>
                                  </>
                                )}
                                {submission.status === "approved" && (
                                  <button
                                    className="p-1 rounded hover:bg-muted/50 text-muted-foreground transition-colors disabled:opacity-50"
                                    onClick={() => handleRevertApproval(submission)}
                                    disabled={processing}
                                    title="Revert to Pending"
                                  >
                                    <RotateCcw className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                );
              }

              // Card View (existing)
              return filteredSubs.map(submission => {
                const profile = profiles[submission.user_id];
                return <div key={submission.id} className="group rounded-xl bg-card/40 border border-border/40 overflow-hidden transition-all hover:border-border/60">
                    {/* Main Content - Horizontal Layout */}
                    <div className="flex gap-4 p-4">
                      {/* 9:16 Video Thumbnail */}
                      <div className="relative w-20 h-[120px] rounded-lg overflow-hidden bg-muted/30 flex-shrink-0 group/thumb">
                        <a href={submission.video_url} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
                          {submission.video_thumbnail_url ? <img src={submission.video_thumbnail_url} alt={submission.video_title || "Video"} className="w-full h-full object-cover transition-transform group-hover/thumb:scale-105" /> : <div className="w-full h-full flex items-center justify-center">
                              <img src={videoLibraryIcon} alt="" className="w-6 h-6 opacity-40" />
                            </div>}
                          {/* Play overlay */}
                          <div className="absolute inset-0 bg-black/0 group-hover/thumb:bg-black/20 transition-colors flex items-center justify-center" />
                        </a>
                        {/* Platform badge */}
                        <div className="absolute bottom-1.5 right-1.5 h-5 w-5 rounded-full bg-black/60 flex items-center justify-center">
                          <img src={getPlatformLogo(submission.platform)} alt={submission.platform} className="h-3 w-3" />
                        </div>
                        {/* Refresh metadata button for missing data */}
                        {(!submission.video_thumbnail_url || (submission.views === null && submission.likes === null)) && (
                          <button
                            className="absolute top-1.5 right-1.5 h-5 w-5 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRefreshMetadata(submission);
                            }}
                            disabled={processing}
                            title="Refresh video metadata"
                          >
                            <RefreshCw className="h-3 w-3 text-white" />
                          </button>
                        )}
                      </div>

                      {/* Video Details */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        {/* Top: Title & Status */}
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <a href={submission.video_url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium tracking-[-0.3px] line-clamp-2 hover:underline transition-all">
                              {submission.video_title || submission.video_description || "Untitled Video"}
                            </a>
                            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 border-0 ${submission.status === "approved" ? "bg-emerald-500/10 text-emerald-500" : submission.status === "rejected" ? "bg-red-500/10 text-red-500" : "bg-amber-500/10 text-amber-500"}`} style={{
                            fontFamily: 'Inter',
                            letterSpacing: '-0.5px'
                          }}>
                              {submission.status === "approved" && <Check className="h-3 w-3" />}
                              {submission.status === "rejected" && <X className="h-3 w-3" />}
                              {submission.status === "pending" && <Clock className="h-3 w-3" />}
                              {submission.status}
                            </div>
                          </div>
                          
                          {/* Author info */}
                          <div className="flex items-center gap-2 mb-2">
                            {submission.video_author_avatar ? <img src={submission.video_author_avatar} alt="" className="h-4 w-4 rounded-full" /> : <Avatar className="h-4 w-4">
                                <AvatarImage src={profile?.avatar_url || undefined} />
                                <AvatarFallback className="text-[8px]">
                                  {profile?.username?.[0]?.toUpperCase() || "?"}
                                </AvatarFallback>
                              </Avatar>}
                            <span className="text-xs text-muted-foreground">
                              @{submission.video_author_username || profile?.username}
                            </span>
                            <span className="text-xs text-muted-foreground/50">•</span>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(submission.submitted_at), {
                              addSuffix: true
                            })}
                            </span>
                          </div>
                        </div>

                        {/* Bottom: Metrics Row */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 text-xs text-muted-foreground font-['Inter']" style={{
                          letterSpacing: '-0.05em'
                        }}>
                            <div className="flex items-center gap-1">
                              <span className="font-medium text-foreground tabular-nums">{formatNumber(submission.views)}</span>
                              <span>views</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="font-medium text-foreground tabular-nums">{formatNumber(submission.likes)}</span>
                              <span>likes</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="font-medium text-foreground tabular-nums">{formatNumber(submission.comments)}</span>
                              <span>comments</span>
                            </div>
                          </div>
                          <span className="text-sm font-semibold text-foreground font-['Inter'] tabular-nums">
                            ${getPayoutForSubmission(submission).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Notes */}
                    {submission.submission_notes && <div className="px-4 pb-3">
                        <p className="text-xs text-muted-foreground bg-muted/20 rounded-lg px-3 py-2 tracking-[-0.3px]">
                          {submission.submission_notes}
                        </p>
                      </div>}

                    {/* Rejection reason */}
                    {submission.rejection_reason && <div className="px-4 pb-3">
                        <p className="text-xs text-red-400 bg-red-500/5 border border-red-500/10 rounded-lg px-3 py-2 tracking-[-0.3px]">
                          {submission.rejection_reason}
                        </p>
                      </div>}

                    {/* Actions */}
                    {submission.status === "pending" && <div className="flex border-t border-border/30">
                        <button className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-red-400 hover:bg-red-500/5 transition-colors tracking-[-0.5px] disabled:opacity-50" onClick={() => {
                      setSelectedSubmission(submission);
                      setRejectDialogOpen(true);
                    }} disabled={processing}>
                          <X className="h-3.5 w-3.5" />
                          Reject
                        </button>
                        <div className="w-px bg-border/30" />
                        <button className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors tracking-[-0.5px] disabled:opacity-50 ${submission.is_flagged ? "text-orange-400 bg-orange-500/10" : "text-orange-400 hover:bg-orange-500/5"}`} onClick={() => handleFlag(submission)} disabled={processing}>
                          <img alt="" className="h-3.5 w-3.5" src={flagIcon} />
                          {submission.is_flagged ? "Flagged" : "Flag"}
                        </button>
                        <div className="w-px bg-border/30" />
                        <button className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/5 transition-colors tracking-[-0.5px] disabled:opacity-50" onClick={() => handleApprove(submission)} disabled={processing}>
                          <Check className="h-3.5 w-3.5" />
                          Approve
                        </button>
                      </div>}

                    {/* Revert action for approved or rejected submissions */}
                    {(submission.status === "approved" || submission.status === "rejected") && <div className="flex border-t border-border/30">
                        <button className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors tracking-[-0.5px] disabled:opacity-50" onClick={() => handleRevertApproval(submission)} disabled={processing}>
                          <RotateCcw className="h-3.5 w-3.5" />
                          Revert to Pending
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