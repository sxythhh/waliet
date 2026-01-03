import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Check, X, DollarSign, ChevronRight, Search, CalendarDays, Clock, RotateCcw, LayoutGrid, TableIcon, ChevronDown, RefreshCw, Heart, MessageCircle, Share2, Video, Upload, Radar, User, Loader, Eye, ArrowLeft, Grid3X3, Keyboard } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { isSameDay, isWithinInterval, startOfDay, endOfDay, parseISO, startOfWeek, endOfWeek } from "date-fns";
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
import { AudienceScoreIndicator } from "./AudienceScoreIndicator";
import { VideoPreview } from "@/components/ui/VideoPreview";

// Helper to extract platform video ID from URL
const extractPlatformVideoId = (url: string, platform: string): string | null => {
  if (!url) return null;
  try {
    if (platform.toLowerCase() === "tiktok") {
      // TikTok URLs: /video/ID or /photo/ID
      const match = url.match(/\/(video|photo)\/(\d+)/);
      return match ? match[2] : null;
    } else if (platform.toLowerCase() === "instagram") {
      // Instagram URLs: /reel/ID or /p/ID
      const match = url.match(/\/(reel|p)\/([A-Za-z0-9_-]+)/);
      return match ? match[2] : null;
    } else if (platform.toLowerCase() === "youtube") {
      // YouTube URLs: /shorts/ID or ?v=ID
      const shortsMatch = url.match(/\/shorts\/([A-Za-z0-9_-]+)/);
      if (shortsMatch) return shortsMatch[1];
      const vMatch = url.match(/[?&]v=([A-Za-z0-9_-]+)/);
      return vMatch ? vMatch[1] : null;
    }
  } catch (e) {
    console.error("Error extracting video ID:", e);
  }
  return null;
};

// Get tracked video thumbnail URL from Supabase storage
const getTrackedThumbnailUrl = (video: {
  video_url: string;
  video_author_username: string | null;
  platform: string;
}): string | null => {
  const username = video.video_author_username;
  const platform = video.platform?.toLowerCase();
  const adPlatformId = extractPlatformVideoId(video.video_url, platform);
  if (!username || !adPlatformId || !platform) return null;
  return `https://wtmetnsnhqfbswfddkdr.supabase.co/storage/v1/object/public/ads_tracked_thumbnails/${username}/${adPlatformId}_${platform}.jpg`;
};

// Unified video interface that handles both submissions and tracked videos
interface UnifiedVideo {
  id: string;
  user_id: string | null;
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
  video_playback_url: string | null;
  video_author_username: string | null;
  video_author_avatar: string | null;
  video_title: string | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  bot_score: number | null;
  // Source tracking
  source: "submitted" | "tracked";
  // Tracked video specific fields
  estimatedPayout?: number;
  weeklyViews?: number;
  uploaded_at?: string;
}
interface Profile {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  email?: string | null;
}
interface DemographicScore {
  social_account_id: string;
  user_id: string;
  score: number | null;
  platform: string;
}
interface CreatorStats {
  userId: string;
  profile: Profile;
  totalSubmissions: number;
  approvedThisMonth: number;
  pendingThisMonth: number;
  earnedThisMonth: number;
  submissions: UnifiedVideo[];
  totalViews: number;
  trackedVideos: number;
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
    hashtags?: string[] | null;
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
  const [submissions, setSubmissions] = useState<UnifiedVideo[]>([]);
  const [trackedVideos, setTrackedVideos] = useState<UnifiedVideo[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [demographicScores, setDemographicScores] = useState<Record<string, DemographicScore>>({});
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<UnifiedVideo | null>(null);
  const [selectedCreator, setSelectedCreator] = useState<string | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const [sortBy, setSortBy] = useState<"date" | "views" | "payout">("date");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "approved" | "rejected" | "flagged">("all");
  const [filterSource, setFilterSource] = useState<"all" | "submitted" | "tracked">("all");
  const [filterMinViews, setFilterMinViews] = useState<"all" | "met" | "not_met">("all");
  const [minimumViewsThreshold, setMinimumViewsThreshold] = useState<number | null>(null);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"cards" | "table" | "grid">("cards");
  const [selectedDateFilter, setSelectedDateFilter] = useState<Date | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [selectedVideos, setSelectedVideos] = useState<Set<string>>(new Set());
  const [mobileView, setMobileView] = useState<"creators" | "videos">("creators");
  const isMobile = useIsMobile();

  // Grid view state for keyboard navigation
  const [focusedVideoIndex, setFocusedVideoIndex] = useState<number>(-1);
  const [showKeyboardHints, setShowKeyboardHints] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  // Sync state
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);

  // Determine if this is a boost or campaign
  const isBoost = !!boostId;
  const entityId = isBoost ? boostId : campaign?.id;
  const brandId = campaign?.brand_id;
  const rpmRate = campaign?.rpm_rate || 0;
  const hashtags = campaign?.hashtags || [];

  // Calculate payout breakdown for pay_per_post campaigns (flat rate + CPM)
  const getPayoutBreakdown = (submission: UnifiedVideo) => {
    const flatRate = campaign?.payment_model === "pay_per_post" ? campaign?.post_rate || 0 : 0;
    const cpmEarnings = campaign?.rpm_rate && submission.views ? submission.views / 1000 * campaign.rpm_rate : 0;
    return {
      flatRate,
      cpmEarnings,
      total: flatRate + cpmEarnings
    };
  };

  // Calculate payout amount based on payment model
  const getPayoutForSubmission = (video: UnifiedVideo) => {
    // For tracked videos, calculate based on RPM
    if (video.source === "tracked") {
      return video.estimatedPayout || (video.views ? video.views / 1000 * rpmRate : 0);
    }

    // If payout_amount is already set and it's not a pay_per_post with views, use it
    if (video.payout_amount !== null && video.payout_amount !== undefined) {
      // For pay_per_post, add CPM earnings on top of flat rate
      if (campaign?.payment_model === "pay_per_post" && campaign?.rpm_rate && video.views) {
        const cpmEarnings = video.views / 1000 * campaign.rpm_rate;
        return video.payout_amount + cpmEarnings;
      }
      return video.payout_amount;
    }

    // For boosts, calculate based on monthly retainer / videos per month
    if (isBoost) {
      return monthlyRetainer / videosPerMonth;
    }

    // For pay_per_post campaigns: flat rate + CPM from views
    if (campaign?.payment_model === "pay_per_post") {
      const flatRate = campaign?.post_rate || 0;
      const cpmEarnings = campaign?.rpm_rate && video.views ? video.views / 1000 * campaign.rpm_rate : 0;
      return flatRate + cpmEarnings;
    }

    // For RPM-based campaigns (pay_per_view), calculate based on views only
    if (campaign?.rpm_rate && video.views) {
      return video.views / 1000 * campaign.rpm_rate;
    }
    return 0;
  };

  // Get flat rate for display purposes
  const payoutPerVideo = isBoost ? monthlyRetainer / videosPerMonth : campaign?.payment_model === "pay_per_post" ? campaign?.post_rate || 0 : 0;
  const isPayPerPost = isBoost || campaign?.payment_model === "pay_per_post";
  const hasCpmBonus = campaign?.payment_model === "pay_per_post" && campaign?.rpm_rate && campaign.rpm_rate > 0;
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
      if (!isBoost && brandId) {
        fetchTrackedVideosFromCache();
      }
    }
  }, [entityId, brandId]);

  // Fetch minimum views threshold from auto_rejection_rules
  useEffect(() => {
    const fetchMinViewsThreshold = async () => {
      if (!brandId) return;

      const { data } = await supabase
        .from("auto_rejection_rules")
        .select("rule_config")
        .eq("brand_id", brandId)
        .eq("rule_type", "minimum_views")
        .eq("is_active", true)
        .single();

      if (data?.rule_config && typeof data.rule_config === 'object' && 'threshold' in data.rule_config) {
        setMinimumViewsThreshold(parseInt(String((data.rule_config as { threshold: unknown }).threshold), 10));
      }
    };

    fetchMinViewsThreshold();
  }, [brandId]);
  const fetchSubmissions = async () => {
    if (!entityId) return;
    setLoading(true);
    try {
      // Fetch from unified video_submissions table (includes both submitted and tracked videos)
      const {
        data,
        error
      } = await supabase.from("video_submissions").select("*").eq("source_type", isBoost ? "boost" : "campaign").eq("source_id", entityId).order("submitted_at", {
        ascending: false
      });
      if (error) throw error;

      // Map to the expected format - now includes both submitted and tracked videos
      const submissionsData: UnifiedVideo[] = (data || []).map(v => ({
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
        video_playback_url: (v as any).video_playback_url || null,
        video_author_username: v.video_author_username,
        video_author_avatar: v.video_author_avatar,
        video_title: v.video_title,
        views: v.views,
        likes: v.likes,
        comments: v.comments,
        shares: v.shares,
        bot_score: (v as any).bot_score || null,
        // Use the source field from database, default to 'submitted' for legacy records
        source: (v.source === "tracked" ? "tracked" : "submitted") as "submitted" | "tracked",
        uploaded_at: v.video_upload_date
      }));
      setSubmissions(submissionsData);

      // Fetch profiles for all users
      if (submissionsData.length > 0) {
        const userIds = [...new Set(submissionsData.filter(s => s.user_id).map(s => s.user_id!))];
        if (userIds.length > 0) {
          const {
            data: profilesData
          } = await supabase.from("profiles").select("id, username, full_name, avatar_url, email").in("id", userIds);
          if (profilesData) {
            const profileMap: Record<string, Profile> = {};
            profilesData.forEach(p => {
              profileMap[p.id] = p;
            });
            setProfiles(prev => ({
              ...prev,
              ...profileMap
            }));
          }

          // Fetch demographic scores for users
          const {
            data: socialAccountsData
          } = await supabase.from("social_accounts").select("id, user_id, platform").in("user_id", userIds);
          if (socialAccountsData && socialAccountsData.length > 0) {
            const socialAccountIds = socialAccountsData.map(sa => sa.id);
            const {
              data: demographicsData
            } = await supabase.from("demographic_submissions").select("social_account_id, score").in("social_account_id", socialAccountIds).eq("status", "approved");
            if (demographicsData) {
              const demoMap: Record<string, DemographicScore> = {};
              demographicsData.forEach(d => {
                const socialAccount = socialAccountsData.find(sa => sa.id === d.social_account_id);
                if (socialAccount) {
                  demoMap[socialAccount.user_id] = {
                    social_account_id: d.social_account_id,
                    user_id: socialAccount.user_id,
                    score: d.score,
                    platform: socialAccount.platform
                  };
                }
              });
              setDemographicScores(prev => ({
                ...prev,
                ...demoMap
              }));
            }
          }
        }
      }

      // Update last synced time from the most recent tracked video
      const trackedVideos = submissionsData.filter(s => s.source === "tracked");
      if (trackedVideos.length > 0) {
        setLastSynced(new Date());
      }
    } catch (error) {
      console.error("Error fetching submissions:", error);
      toast.error("Failed to load video submissions");
    } finally {
      setLoading(false);
    }
  };
  const fetchTrackedVideosFromCache = async () => {
    // Fetch ALL tracked videos from cached_campaign_videos
    // This includes both matched and unmatched videos that haven't been synced to video_submissions yet
    if (!entityId || !brandId) return;
    try {
      const {
        data,
        error
      } = await supabase.from("cached_campaign_videos").select("*").eq("campaign_id", entityId).order("uploaded_at", {
        ascending: false
      });
      if (error) throw error;

      // Get existing shortimize_video_ids from submissions to avoid duplicates
      const existingShortimizeIds = new Set(submissions.filter(s => s.source === "tracked").map(s => (s as any).shortimize_video_id).filter(Boolean));

      // Filter out videos that are already in video_submissions
      const newTrackedVideos = (data || []).filter(v => !existingShortimizeIds.has(v.shortimize_video_id));

      // Map tracked videos to unified format
      const tracked: UnifiedVideo[] = newTrackedVideos.map(v => ({
        id: v.id,
        user_id: v.user_id,
        video_url: v.video_url || "",
        platform: v.platform,
        submission_notes: null,
        status: v.user_id ? "approved" : "tracked",
        // Matched videos show as approved
        payout_amount: null,
        submitted_at: v.uploaded_at || v.cached_at,
        reviewed_at: null,
        rejection_reason: null,
        is_flagged: null,
        video_description: v.caption || v.description,
        video_thumbnail_url: v.thumbnail_url,
        video_playback_url: null, // Tracked videos don't have playback URLs cached
        video_author_username: v.username,
        video_author_avatar: null,
        video_title: v.title,
        views: v.views,
        likes: v.likes,
        comments: v.comments,
        shares: v.shares,
        bot_score: null, // Tracked videos don't have bot scores yet
        source: "tracked" as const,
        estimatedPayout: v.user_id ? (v.views || 0) / 1000 * rpmRate : 0,
        weeklyViews: 0,
        uploaded_at: v.uploaded_at
      }));
      setTrackedVideos(tracked);

      // Update last synced time
      if (data && data.length > 0) {
        const latestUpdate = data.reduce((latest, v) => {
          const vDate = new Date(v.updated_at);
          return vDate > latest ? vDate : latest;
        }, new Date(0));
        if (!lastSynced || latestUpdate > lastSynced) {
          setLastSynced(latestUpdate);
        }
      }

      // Fetch profiles for tracked video users
      const trackedUserIds = [...new Set(tracked.filter(t => t.user_id).map(t => t.user_id!))];
      if (trackedUserIds.length > 0) {
        const {
          data: profilesData
        } = await supabase.from("profiles").select("id, username, full_name, avatar_url, email").in("id", trackedUserIds);
        if (profilesData) {
          const profileMap: Record<string, Profile> = {};
          profilesData.forEach(p => {
            profileMap[p.id] = p;
          });
          setProfiles(prev => ({
            ...prev,
            ...profileMap
          }));
        }
      }
    } catch (error) {
      console.error("Error fetching tracked videos:", error);
    }
  };
  const handleSync = async () => {
    if (!brandId || !entityId) return;
    setSyncing(true);
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke("sync-campaign-videos", {
        body: {
          brandId,
          campaignId: entityId
        }
      });
      if (error) throw error;
      toast.success(`Synced ${data?.totalVideosMatched || 0} matched videos`);
      // Refetch both submissions and cached tracked videos
      await Promise.all([fetchSubmissions(), fetchTrackedVideosFromCache()]);
    } catch (error) {
      console.error("Error syncing videos:", error);
      toast.error("Failed to sync videos");
    } finally {
      setSyncing(false);
    }
  };

  // Combine submissions and tracked videos, avoiding duplicates
  const allVideos = useMemo(() => {
    // Create a set of video URLs from submissions to avoid duplicates
    const submissionUrls = new Set(submissions.map(s => s.video_url.toLowerCase()));

    // Filter out tracked videos that are already in submissions
    const uniqueTracked = trackedVideos.filter(t => !submissionUrls.has(t.video_url.toLowerCase()));
    return [...submissions, ...uniqueTracked];
  }, [submissions, trackedVideos]);

  // Calculate totals
  const totals = useMemo(() => {
    const vids = allVideos;
    const submittedVideos = submissions.filter(s => s.source === "submitted");
    const trackedInSubmissions = submissions.filter(s => s.source === "tracked");
    return {
      videos: vids.length,
      views: vids.reduce((sum, v) => sum + (v.views || 0), 0),
      likes: vids.reduce((sum, v) => sum + (v.likes || 0), 0),
      comments: vids.reduce((sum, v) => sum + (v.comments || 0), 0),
      shares: vids.reduce((sum, v) => sum + (v.shares || 0), 0),
      estimatedPayout: vids.reduce((sum, v) => sum + getPayoutForSubmission(v), 0),
      submittedCount: submittedVideos.length,
      trackedCount: trackedInSubmissions.length + trackedVideos.length,
      // matched + unmatched
      matchedTrackedCount: trackedInSubmissions.length,
      unmatchedTrackedCount: trackedVideos.length
    };
  }, [allVideos, submissions, trackedVideos]);
  const handleApprove = async (submission: UnifiedVideo) => {
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
        reviewed_at: new Date().toISOString()
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
          reviewed_at: null
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
        // For campaigns: pay_per_post flat rate is paid immediately
        if (campaign?.payment_model === "pay_per_post" && payoutPerVideo > 0) {
          try {
            const {
              error: paymentError
            } = await supabase.functions.invoke("create-campaign-payment", {
              body: {
                campaign_id: entityId,
                user_id: submission.user_id,
                amount: payoutPerVideo,
                description: `Video approved (flat rate): ${submission.video_url}`,
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

      // Track video on Shortimize
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
        } else if (trackResult?.success && !trackResult.skipped && !trackResult.alreadyTracked) {
          toast.success("Video tracked on Shortimize", {
            duration: 2000
          });
        }
      } catch (trackError) {
        console.error("Shortimize tracking failed:", trackError);
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
  const handleFlag = async (submission: UnifiedVideo) => {
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
  const handleRevertApproval = async (submission: UnifiedVideo) => {
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
        reviewed_at: null
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
  const handleRefreshMetadata = async (submission: UnifiedVideo) => {
    setProcessing(true);
    try {
      let videoDetails = null;
      const url = submission.video_url;

      // Determine which API to call based on platform
      if (url.includes('tiktok.com')) {
        const {
          data,
          error
        } = await supabase.functions.invoke('fetch-tiktok-video', {
          body: {
            videoUrl: url
          }
        });
        if (error) throw error;
        videoDetails = data?.data || null;
      } else if (url.includes('instagram.com')) {
        const {
          data,
          error
        } = await supabase.functions.invoke('fetch-instagram-post', {
          body: {
            postUrl: url
          }
        });
        if (error) throw error;
        videoDetails = data?.data || null;
      } else if (url.includes('youtube.com') || url.includes('youtu.be')) {
        const {
          data,
          error
        } = await supabase.functions.invoke('fetch-youtube-video', {
          body: {
            videoUrl: url
          }
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
            shares: 0
          };
        }
      }
      if (!videoDetails) {
        toast.error("Could not fetch video metadata. The video may be private or unavailable.");
        return;
      }

      // Update the submission in the database
      const {
        error
      } = await supabase.from("video_submissions").update({
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
        video_title: videoDetails.title || null
      } : s));
      toast.success("Video metadata refreshed!");
    } catch (error) {
      console.error("Error refreshing metadata:", error);
      toast.error("Failed to refresh video metadata");
    } finally {
      setProcessing(false);
    }
  };

  // Video selection handlers
  const toggleVideoSelection = (videoId: string) => {
    const newSet = new Set(selectedVideos);
    if (newSet.has(videoId)) {
      newSet.delete(videoId);
    } else {
      newSet.add(videoId);
    }
    setSelectedVideos(newSet);
  };
  const toggleSelectAllPending = (pendingVideos: UnifiedVideo[]) => {
    const pendingIds = pendingVideos.filter(v => v.status === "pending").map(v => v.id);
    const allSelected = pendingIds.every(id => selectedVideos.has(id));
    if (allSelected) {
      setSelectedVideos(new Set());
    } else {
      setSelectedVideos(new Set(pendingIds));
    }
  };
  const handleBulkApprove = async () => {
    if (selectedVideos.size === 0) return;
    setProcessing(true);
    try {
      const videosToApprove = allVideos.filter(v => selectedVideos.has(v.id) && v.status === "pending");
      for (const video of videosToApprove) {
        await handleApprove(video);
      }
      setSelectedVideos(new Set());
      toast.success(`Approved ${videosToApprove.length} videos`);
    } catch (error) {
      console.error("Bulk approve error:", error);
      toast.error("Failed to approve some videos");
    } finally {
      setProcessing(false);
    }
  };
  const handleBulkReject = async () => {
    if (selectedVideos.size === 0) return;
    setProcessing(true);
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) return;
      const videosToReject = allVideos.filter(v => selectedVideos.has(v.id) && v.status === "pending");
      for (const video of videosToReject) {
        await supabase.from("video_submissions").update({
          status: "rejected",
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
          rejection_reason: "Bulk rejected"
        }).eq("id", video.id);
      }
      setSubmissions(prev => prev.map(s => selectedVideos.has(s.id) && s.status === "pending" ? {
        ...s,
        status: "rejected",
        reviewed_at: new Date().toISOString()
      } : s));
      setSelectedVideos(new Set());
      toast.success(`Rejected ${videosToReject.length} videos`);
      onSubmissionReviewed?.();
    } catch (error) {
      console.error("Bulk reject error:", error);
      toast.error("Failed to reject some videos");
    } finally {
      setProcessing(false);
    }
  };
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const creatorStats: CreatorStats[] = useMemo(() => {
    const statsMap = new Map<string, CreatorStats>();

    // Process submissions
    allVideos.forEach(video => {
      if (!video.user_id) return;
      let stats = statsMap.get(video.user_id);
      if (!stats) {
        const profile = profiles[video.user_id];
        if (!profile) return;
        stats = {
          userId: video.user_id,
          profile,
          totalSubmissions: 0,
          approvedThisMonth: 0,
          pendingThisMonth: 0,
          earnedThisMonth: 0,
          submissions: [],
          totalViews: 0,
          trackedVideos: 0
        };
        statsMap.set(video.user_id, stats);
      }
      stats.submissions.push(video);
      stats.totalViews += video.views || 0;
      if (video.source === "tracked") {
        stats.trackedVideos++;
      } else {
        stats.totalSubmissions++;
        const date = new Date(video.submitted_at);
        if (date >= monthStart && date <= monthEnd) {
          if (video.status === "approved") {
            stats.approvedThisMonth++;
            stats.earnedThisMonth += getPayoutForSubmission(video);
          } else if (video.status === "pending") {
            stats.pendingThisMonth++;
          }
        }
      }
    });
    return Array.from(statsMap.values()).sort((a, b) => b.approvedThisMonth - a.approvedThisMonth || b.totalViews - a.totalViews);
  }, [allVideos, profiles, monthStart, monthEnd]);
  const formatNumber = (num: number | null | undefined) => {
    if (num === null || num === undefined) return '—';
    if (num === 0) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  // Keyboard navigation for grid view
  const getFilteredVideos = useCallback(() => {
    let filteredVids = selectedCreator ? allVideos.filter(v => v.user_id === selectedCreator) : allVideos;
    if (filterSource !== "all") {
      filteredVids = filteredVids.filter(v => v.source === filterSource);
    }
    if (filterStatus === "flagged") {
      filteredVids = filteredVids.filter(v => v.is_flagged === true);
    } else if (filterStatus !== "all") {
      filteredVids = filteredVids.filter(v => v.status === filterStatus);
    }
    // Filter by minimum views threshold
    if (filterMinViews !== "all" && minimumViewsThreshold !== null) {
      if (filterMinViews === "met") {
        filteredVids = filteredVids.filter(v => (v.views || 0) >= minimumViewsThreshold);
      } else if (filterMinViews === "not_met") {
        filteredVids = filteredVids.filter(v => (v.views || 0) < minimumViewsThreshold);
      }
    }
    if (selectedDateFilter) {
      filteredVids = filteredVids.filter(v => isSameDay(new Date(v.submitted_at), selectedDateFilter));
    } else if (dateRange?.from) {
      filteredVids = filteredVids.filter(v => {
        const videoDate = new Date(v.submitted_at);
        if (dateRange.to) {
          return isWithinInterval(videoDate, {
            start: startOfDay(dateRange.from!),
            end: endOfDay(dateRange.to)
          });
        }
        return isSameDay(videoDate, dateRange.from!);
      });
    }
    return [...filteredVids].sort((a, b) => {
      if (sortBy === "date") {
        return new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime();
      } else if (sortBy === "views") {
        return (b.views || 0) - (a.views || 0);
      } else if (sortBy === "payout") {
        const payoutA = a.payout_amount || (a.views ? a.views / 1000 * rpmRate : 0);
        const payoutB = b.payout_amount || (b.views ? b.views / 1000 * rpmRate : 0);
        return payoutB - payoutA;
      }
      return 0;
    });
  }, [allVideos, selectedCreator, filterSource, filterStatus, filterMinViews, minimumViewsThreshold, selectedDateFilter, dateRange, sortBy, rpmRate]);

  // Handle keyboard navigation in grid view
  useEffect(() => {
    if (viewMode !== "grid") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const filteredVids = getFilteredVideos();
      const gridColumns = 4; // Approximate columns in grid

      switch (e.key) {
        case "ArrowRight":
          e.preventDefault();
          setFocusedVideoIndex(prev => Math.min(prev + 1, filteredVids.length - 1));
          break;
        case "ArrowLeft":
          e.preventDefault();
          setFocusedVideoIndex(prev => Math.max(prev - 1, 0));
          break;
        case "ArrowDown":
          e.preventDefault();
          setFocusedVideoIndex(prev => Math.min(prev + gridColumns, filteredVids.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setFocusedVideoIndex(prev => Math.max(prev - gridColumns, 0));
          break;
        case "a":
        case "A":
          // Approve focused video
          if (focusedVideoIndex >= 0 && focusedVideoIndex < filteredVids.length) {
            const video = filteredVids[focusedVideoIndex];
            if (video.status === "pending" && !processing) {
              handleApprove(video);
            }
          }
          break;
        case "r":
        case "R":
          // Reject focused video
          if (focusedVideoIndex >= 0 && focusedVideoIndex < filteredVids.length) {
            const video = filteredVids[focusedVideoIndex];
            if (video.status === "pending" && !processing) {
              setSelectedSubmission(video);
              setRejectDialogOpen(true);
            }
          }
          break;
        case "o":
        case "O":
          // Open video in new tab
          if (focusedVideoIndex >= 0 && focusedVideoIndex < filteredVids.length) {
            const video = filteredVids[focusedVideoIndex];
            window.open(video.video_url, "_blank");
          }
          break;
        case "?":
          // Toggle keyboard hints
          setShowKeyboardHints(prev => !prev);
          break;
        case "Escape":
          setFocusedVideoIndex(-1);
          setShowKeyboardHints(false);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [viewMode, focusedVideoIndex, processing, getFilteredVideos]);

  // Scroll focused item into view
  useEffect(() => {
    if (viewMode === "grid" && focusedVideoIndex >= 0 && gridRef.current) {
      const focusedElement = gridRef.current.querySelector(`[data-grid-index="${focusedVideoIndex}"]`);
      if (focusedElement) {
        focusedElement.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  }, [focusedVideoIndex, viewMode]);

  return <div className="h-full flex flex-col overflow-hidden">
      {/* Stats Header */}
      <div className="flex-shrink-0 p-4 border-b border-border space-y-3">
        {/* Top row: Title, hashtags, sync button */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground tracking-[-0.5px]">Videos</h3>
              {lastSynced && <span className="text-[11px] text-muted-foreground hidden sm:inline">
                  Updated {format(lastSynced, "MMM d, h:mm a")}
                </span>}
            </div>
            {/* Hashtags */}
            {hashtags.length > 0 && <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground/70 font-medium">Tracking:</span>
                {hashtags.map(tag => <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                    #{tag.replace(/^#/, "")}
                  </span>)}
              </div>}
          </div>
          
          {/* Sync button - only for campaigns with brand */}
          {!isBoost && brandId && <Button onClick={handleSync} disabled={syncing} size="sm" className="h-7 px-2.5 gap-1.5 text-[11px] font-medium bg-foreground text-background hover:bg-foreground/90">
              <RefreshCw className={`h-3 w-3 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Syncing..." : "Sync"}
            </Button>}
        </div>

        {/* Mobile View Toggle */}
        <div className="flex md:hidden items-center gap-1 bg-muted/30 rounded-lg p-1">
          <button onClick={() => setMobileView("creators")} className={cn("flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-xs font-medium transition-colors", mobileView === "creators" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
            
            Creators
          </button>
          <button onClick={() => setMobileView("videos")} className={cn("flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-xs font-medium transition-colors", mobileView === "videos" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
            
            Videos
          </button>
        </div>

      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left: Creator List */}
        <div className={cn("md:w-[340px] flex-shrink-0 border-r border-border overflow-hidden flex-col",
      // Mobile: show/hide based on mobileView
      mobileView === "creators" ? "flex" : "hidden",
      // Desktop: always show
      "md:flex")}>
          {/* Header with title and search */}
          <div className="p-3 border-b space-y-2 border-border/50 py-2">
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
                      <p className="text-sm">No creators found</p>
                    </div>;
              }
              return filteredCreators.map(creator => {
                const isSelected = selectedCreator === creator.userId;
                const pendingCount = creator.submissions.filter(s => s.status === "pending").length;
                return <button key={creator.userId} onClick={() => {
                  setSelectedCreator(isSelected ? null : creator.userId);
                  // On mobile, switch to videos view when selecting a creator
                  if (!isSelected && isMobile) {
                    setMobileView("videos");
                  }
                }} className="w-full rounded-xl py-2 px-3 text-left transition-all bg-card/30 hover:bg-card/50 border border-border/30 font-inter tracking-[-0.5px]">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 border border-border/40">
                          <AvatarImage src={creator.profile.avatar_url || undefined} />
                          <AvatarFallback className="text-xs bg-muted/40">
                            {creator.profile.username?.[0]?.toUpperCase() || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm truncate">
                              {creator.profile.full_name || creator.profile.username}
                            </p>
                            {pendingCount > 0 && <span className="text-[10px] text-amber-500 font-medium whitespace-nowrap">
                                {pendingCount} Pending
                              </span>}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            @{creator.profile.username}
                          </p>
                        </div>
                        <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${isSelected ? "rotate-90" : ""}`} />
                      </div>
                      {/* Submission Heatmap - only show when selected */}
                      {isSelected && <div className="mt-3">
                          <SubmissionHeatmap submissions={creator.submissions.map(s => ({
                      submitted_at: s.uploaded_at || s.submitted_at,
                      status: s.status,
                      source: s.source
                    }))} onDateClick={date => {
                      setSelectedCreator(creator.userId);
                      setSelectedDateFilter(prev => prev && isSameDay(prev, date) ? null : date);
                    }} selectedDate={selectedCreator === creator.userId ? selectedDateFilter : null} />
                        </div>}
                    </button>;
              });
            })()}
            </div>
          </ScrollArea>
        </div>

        {/* Right: Video List */}
        <div className={cn("flex-1 overflow-hidden flex-col",
      // Mobile: show/hide based on mobileView
      mobileView === "videos" ? "flex" : "hidden",
      // Desktop: always show
      "md:flex")}>
          <div className="p-2.5 border-b border-border space-y-2 py-2">
            {/* Header */}
            <div className="flex items-center gap-2.5 h-8">
              {/* Mobile back button */}
              <button onClick={() => setMobileView("creators")} className="flex md:hidden items-center justify-center h-7 w-7 rounded-md bg-muted/50 hover:bg-muted transition-colors">
                <ArrowLeft className="h-4 w-4" />
              </button>
              {selectedCreator && profiles[selectedCreator] && <Avatar className="h-7 w-7 ring-2 ring-background shrink-0">
                  <AvatarImage src={profiles[selectedCreator]?.avatar_url || undefined} />
                  <AvatarFallback className="text-xs font-medium bg-muted/60">
                    {profiles[selectedCreator]?.username?.[0]?.toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>}
              <h3 className="text-sm font-medium text-foreground tracking-[-0.5px]">
                {selectedCreator ? `${profiles[selectedCreator]?.full_name || profiles[selectedCreator]?.username}'s Videos` : "All Videos"}
              </h3>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 flex-wrap overflow-x-auto pb-1 -mb-1">
              {/* Source Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1 bg-muted/30 rounded-md px-2.5 py-1.5 text-xs tracking-[-0.5px] transition-colors">
                    <span className={filterSource === "all" ? "text-muted-foreground" : "text-foreground"}>
                      {filterSource === "all" ? "All Sources" : filterSource === "submitted" ? "Submitted" : "Tracked"}
                    </span>
                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="bg-background border border-border min-w-[120px]">
                  {[{
                  value: "all",
                  label: "All Sources"
                }, {
                  value: "submitted",
                  label: "Submitted"
                }, {
                  value: "tracked",
                  label: "Tracked"
                }].map(option => <DropdownMenuItem key={option.value} onClick={() => setFilterSource(option.value as typeof filterSource)} className={`text-xs tracking-[-0.5px] cursor-pointer ${filterSource === option.value ? "bg-muted/50 text-foreground" : "text-muted-foreground"}`}>
                      {option.label}
                    </DropdownMenuItem>)}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Status Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1 bg-muted/30 rounded-md px-2.5 py-1.5 text-xs tracking-[-0.5px] transition-colors">
                    <span className={filterStatus === "all" ? "text-muted-foreground" : "text-foreground"}>
                      {filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1)}
                    </span>
                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="bg-background border border-border min-w-[100px]">
                  {(["all", "pending", "approved", "rejected", "flagged"] as const).map(status => <DropdownMenuItem key={status} onClick={() => setFilterStatus(status)} className={`text-xs tracking-[-0.5px] cursor-pointer ${filterStatus === status ? "bg-muted/50 text-foreground" : "text-muted-foreground"}`}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </DropdownMenuItem>)}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Min Views Filter - only show if threshold is configured */}
              {minimumViewsThreshold !== null && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-1 bg-muted/30 rounded-md px-2.5 py-1.5 text-xs tracking-[-0.5px] transition-colors">
                      <span className={filterMinViews === "all" ? "text-muted-foreground" : "text-foreground"}>
                        {filterMinViews === "all" ? `Min ${minimumViewsThreshold.toLocaleString()} Views` : filterMinViews === "met" ? "Met Threshold" : "Below Threshold"}
                      </span>
                      <ChevronDown className="h-3 w-3 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="bg-background border border-border min-w-[140px]">
                    {[{
                    value: "all",
                    label: `All (Min ${minimumViewsThreshold.toLocaleString()})`
                  }, {
                    value: "met",
                    label: "Met Threshold"
                  }, {
                    value: "not_met",
                    label: "Below Threshold"
                  }].map(option => <DropdownMenuItem key={option.value} onClick={() => setFilterMinViews(option.value as typeof filterMinViews)} className={`text-xs tracking-[-0.5px] cursor-pointer ${filterMinViews === option.value ? "bg-muted/50 text-foreground" : "text-muted-foreground"}`}>
                        {option.label}
                      </DropdownMenuItem>)}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Sort By Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1 bg-muted/30 rounded-md px-2.5 py-1.5 text-xs tracking-[-0.5px] transition-colors">
                    <span className="text-foreground">
                      {sortBy === "date" ? "Upload Date" : sortBy === "views" ? "Views" : "Payout"}
                    </span>
                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="bg-background border border-border min-w-[120px]">
                  {[{
                  value: "date",
                  label: "Upload Date"
                }, {
                  value: "views",
                  label: "Views"
                }, {
                  value: "payout",
                  label: "Payout"
                }].map(option => <DropdownMenuItem key={option.value} onClick={() => setSortBy(option.value as typeof sortBy)} className={`text-xs tracking-[-0.5px] cursor-pointer ${sortBy === option.value ? "bg-muted/50 text-foreground" : "text-muted-foreground"}`}>
                      {option.label}
                    </DropdownMenuItem>)}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* View Toggle */}
              <div className="flex items-center gap-0.5 bg-muted/30 rounded-lg p-0.5">
                <button onClick={() => setViewMode("cards")} className={`p-1.5 rounded-md transition-colors ${viewMode === "cards" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`} title="Card view">
                  <LayoutGrid className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => setViewMode("table")} className={`p-1.5 rounded-md transition-colors ${viewMode === "table" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`} title="Table view">
                  <TableIcon className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => { setViewMode("grid"); setFocusedVideoIndex(0); }} className={`p-1.5 rounded-md transition-colors ${viewMode === "grid" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`} title="Grid view (with keyboard shortcuts)">
                  <Grid3X3 className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Keyboard shortcuts hint for grid view */}
              {viewMode === "grid" && (
                <button
                  onClick={() => setShowKeyboardHints(prev => !prev)}
                  className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded-md text-[10px] transition-colors",
                    showKeyboardHints ? "bg-primary/10 text-primary" : "bg-muted/30 text-muted-foreground hover:text-foreground"
                  )}
                  title="Press ? for keyboard shortcuts"
                >
                  <Keyboard className="h-3 w-3" />
                  <span className="hidden sm:inline">Shortcuts</span>
                </button>
              )}

              {/* Date Range Picker */}
              <div className="flex items-center gap-2 ml-auto">
                <Popover>
                  <PopoverTrigger asChild>
                    <button className={cn("flex items-center gap-2 px-3 py-1.5 text-[11px] font-inter tracking-[-0.5px] rounded-lg transition-all duration-200", dateRange?.from ? "bg-primary/10 text-primary hover:bg-primary/15" : "bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-foreground")}>
                      {dateRange?.from ? dateRange.to ? <span>{format(dateRange.from, "MMM d")} – {format(dateRange.to, "MMM d")}</span> : <span>{format(dateRange.from, "MMM d, yyyy")}</span> : <span>Date Range</span>}
                      {dateRange?.from && <X className="h-3 w-3 ml-0.5 hover:text-destructive transition-colors" onClick={e => {
                      e.stopPropagation();
                      setDateRange(undefined);
                      setSelectedDateFilter(null);
                    }} />}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-background/80 backdrop-blur-xl border-border/50" align="end" sideOffset={8}>
                    <div className="p-3 border-b border-border">
                      <p className="text-xs font-medium font-inter tracking-[-0.5px] text-foreground">Select date range</p>
                      <p className="text-[10px] text-muted-foreground tracking-[-0.5px] mt-0.5">Filter videos by date</p>
                    </div>
                    <Calendar mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={range => {
                    setDateRange(range);
                    setSelectedDateFilter(null);
                  }} numberOfMonths={2} className={cn("p-3 pointer-events-auto")} />
                    <div className="p-3 border-t border-border flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        {[{
                        label: "Today",
                        days: 0
                      }, {
                        label: "7d",
                        days: 7
                      }, {
                        label: "30d",
                        days: 30
                      }].map(({
                        label,
                        days
                      }) => <button key={label} onClick={() => {
                        const end = new Date();
                        const start = new Date();
                        start.setDate(start.getDate() - days);
                        setDateRange({
                          from: start,
                          to: end
                        });
                      }} className="px-2 py-1 text-[10px] font-inter tracking-[-0.5px] rounded-md bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                            {label}
                          </button>)}
                      </div>
                      {dateRange?.from && <button onClick={() => {
                      setDateRange(undefined);
                      setSelectedDateFilter(null);
                    }} className="text-[10px] font-inter tracking-[-0.5px] text-muted-foreground hover:text-foreground transition-colors">
                          Clear
                        </button>}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-3 space-y-2 w-full">
              {(() => {
              // Get filtered videos
              let filteredVids = selectedCreator ? allVideos.filter(v => v.user_id === selectedCreator) : allVideos;

              // Apply source filter
              if (filterSource !== "all") {
                filteredVids = filteredVids.filter(v => v.source === filterSource);
              }

              // Apply status filter
              if (filterStatus === "flagged") {
                filteredVids = filteredVids.filter(v => v.is_flagged === true);
              } else if (filterStatus !== "all") {
                filteredVids = filteredVids.filter(v => v.status === filterStatus);
              }

              // Apply minimum views filter
              if (filterMinViews !== "all" && minimumViewsThreshold !== null) {
                if (filterMinViews === "met") {
                  filteredVids = filteredVids.filter(v => (v.views || 0) >= minimumViewsThreshold);
                } else if (filterMinViews === "not_met") {
                  filteredVids = filteredVids.filter(v => (v.views || 0) < minimumViewsThreshold);
                }
              }

              // Apply date filter
              if (selectedDateFilter) {
                filteredVids = filteredVids.filter(v => isSameDay(new Date(v.submitted_at), selectedDateFilter));
              } else if (dateRange?.from) {
                filteredVids = filteredVids.filter(v => {
                  const videoDate = new Date(v.submitted_at);
                  if (dateRange.to) {
                    return isWithinInterval(videoDate, {
                      start: startOfDay(dateRange.from!),
                      end: endOfDay(dateRange.to)
                    });
                  }
                  return isSameDay(videoDate, dateRange.from!);
                });
              }

              // Apply sorting
              filteredVids = [...filteredVids].sort((a, b) => {
                if (sortBy === "date") {
                  return new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime();
                } else if (sortBy === "views") {
                  return (b.views || 0) - (a.views || 0);
                } else if (sortBy === "payout") {
                  const payoutA = a.payout_amount || (a.views ? a.views / 1000 * rpmRate : 0);
                  const payoutB = b.payout_amount || (b.views ? b.views / 1000 * rpmRate : 0);
                  return payoutB - payoutA;
                }
                return 0;
              });
              if (filteredVids.length === 0) {
                return <div className="text-center py-12 text-muted-foreground">
                      <p className="text-sm tracking-[-0.5px]">No videos found for the applied filter</p>
                    </div>;
              }

              // Table View
              if (viewMode === "table") {
                return <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent border-border/40">
                          <TableHead className="w-8 p-0 pl-2">
                            <div className="h-4 w-4 rounded border border-border/60 flex items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => toggleSelectAllPending(filteredVids)}>
                              {filteredVids.filter(v => v.status === "pending").length > 0 && filteredVids.filter(v => v.status === "pending").every(v => selectedVideos.has(v.id)) && <Check className="h-3 w-3 text-primary" />}
                            </div>
                          </TableHead>
                          <TableHead className="text-[10px] font-['Inter'] font-medium tracking-[-0.5px] text-muted-foreground">Title</TableHead>
                          <TableHead className="text-[10px] font-['Inter'] font-medium tracking-[-0.5px] text-muted-foreground">User</TableHead>
                          <TableHead className="text-[10px] font-['Inter'] font-medium tracking-[-0.5px] text-muted-foreground">Account</TableHead>
                          <TableHead className="text-[10px] font-['Inter'] font-medium tracking-[-0.5px] text-muted-foreground">Status</TableHead>
                          <TableHead className="text-[10px] font-['Inter'] font-medium tracking-[-0.5px] text-muted-foreground text-right">Views</TableHead>
                          <TableHead className="text-[10px] font-['Inter'] font-medium tracking-[-0.5px] text-muted-foreground text-right">Likes</TableHead>
                          <TableHead className="text-[10px] font-['Inter'] font-medium tracking-[-0.5px] text-muted-foreground text-right">Comments</TableHead>
                          <TableHead className="text-[10px] font-['Inter'] font-medium tracking-[-0.5px] text-muted-foreground text-right">Payout</TableHead>
                          <TableHead className="text-[10px] font-['Inter'] font-medium tracking-[-0.5px] text-muted-foreground">Date</TableHead>
                          <TableHead className="text-[10px] font-['Inter'] font-medium tracking-[-0.5px] text-muted-foreground text-center">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredVids.map(video => {
                      const profile = video.user_id ? profiles[video.user_id] : null;
                      const demographicScore = video.user_id ? demographicScores[video.user_id] : null;
                      const isSelected = selectedVideos.has(video.id);
                      return <TableRow key={video.id} className={cn("border-border/30 group font-['Inter'] hover:bg-[#0e0e0e]", isSelected && "bg-primary/5")}>
                              <TableCell className="w-8 p-0 pl-2">
                                <div className={cn("h-4 w-4 rounded border flex items-center justify-center cursor-pointer transition-all", isSelected ? "border-primary bg-primary" : "border-border/60 opacity-0 group-hover:opacity-100 hover:bg-muted/50")} onClick={() => toggleVideoSelection(video.id)}>
                                  {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                                </div>
                              </TableCell>
                              <TableCell className="max-w-[200px]">
                                <a href={video.video_url} target="_blank" rel="noopener noreferrer" className="text-xs font-medium font-['Inter'] tracking-[-0.5px] line-clamp-1 hover:underline">
                                  {video.video_title || video.video_description || "Untitled Video"}
                                </a>
                              </TableCell>
                              <TableCell>
                                {profile ? <div className="flex items-center gap-1.5">
                                    {profile.avatar_url ? <img src={profile.avatar_url} alt={profile.full_name || profile.username || "User"} className="h-5 w-5 rounded-md object-cover flex-shrink-0" /> : <div className="h-5 w-5 rounded-md bg-muted/50 flex items-center justify-center flex-shrink-0">
                                        <span className="text-[10px] font-medium font-['Inter'] tracking-[-0.5px] text-muted-foreground uppercase">
                                          {(profile.full_name || profile.username || "U").charAt(0)}
                                        </span>
                                      </div>}
                                    <span className="text-xs font-['Inter'] tracking-[-0.5px] text-foreground">
                                      {profile.full_name || profile.username}
                                    </span>
                                  </div> : null}
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col gap-1.5">
                                  <div className="flex items-center gap-1.5">
                                    <div className="h-5 w-5 rounded-full bg-muted/50 flex items-center justify-center flex-shrink-0">
                                      <img src={getPlatformLogo(video.platform)} alt={video.platform} className="h-3 w-3" />
                                    </div>
                                    <span className="text-xs font-['Inter'] tracking-[-0.5px] text-foreground">
                                      {video.video_author_username || profile?.username || "Unknown"}
                                    </span>
                                  </div>
                                  <AudienceScoreIndicator score={demographicScore?.score} />
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 border-transparent font-['Inter'] tracking-[-0.5px] flex items-center gap-1", video.status === "approved" && "bg-green-500/10 text-green-500", video.status === "pending" && "bg-yellow-500/10 text-yellow-500", video.status === "rejected" && "bg-red-500/10 text-red-500", video.status === "tracked" && "bg-purple-500/10 text-purple-500")}>
                                  {video.status === "approved" && <Check className="h-3 w-3" />}
                                  {video.status === "pending" && <Loader className="h-3 w-3" />}
                                  {video.status === "rejected" && <X className="h-3 w-3" />}
                                  {video.status === "tracked" && <Eye className="h-3 w-3" />}
                                  {video.status === "approved" ? "Approved" : video.status === "pending" ? "Pending" : video.status === "rejected" ? "Rejected" : video.status === "tracked" ? "Tracked" : video.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right text-xs font-['Inter'] tracking-[-0.5px] tabular-nums">
                                {formatNumber(video.views)}
                              </TableCell>
                              <TableCell className="text-right text-xs font-['Inter'] tracking-[-0.5px] tabular-nums">
                                {formatNumber(video.likes)}
                              </TableCell>
                              <TableCell className="text-right text-xs font-['Inter'] tracking-[-0.5px] tabular-nums">
                                {formatNumber(video.comments)}
                              </TableCell>
                              <TableCell className="text-right text-xs font-medium font-['Inter'] tracking-[-0.5px] tabular-nums text-green-500">
                                ${getPayoutForSubmission(video).toFixed(2)}
                              </TableCell>
                              <TableCell className="text-xs font-['Inter'] tracking-[-0.5px] text-muted-foreground">
                                {format(new Date(video.submitted_at), "MMM d")}
                              </TableCell>
                              <TableCell>
                                {video.status === "pending" && <div className="flex items-center justify-center gap-1">
                                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0 bg-[#1c823a] hover:bg-[#1c823a]/90 text-white border-t border-t-[#43954d] rounded-sm" onClick={() => handleApprove(video)} disabled={processing}>
                                      <Check className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0 bg-[#b60b0b] hover:bg-[#b60b0b]/90 text-white border-t border-t-[#ed3030] rounded-sm" onClick={() => {
                              setSelectedSubmission(video);
                              setRejectDialogOpen(true);
                            }} disabled={processing}>
                                      <X className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>}
                              </TableCell>
                            </TableRow>;
                    })}
                      </TableBody>
                    </Table>;
              }

              // Grid View - Visual thumbnails with keyboard navigation
              if (viewMode === "grid") {
                return (
                  <div ref={gridRef} className="relative">
                    {/* Keyboard shortcuts overlay */}
                    {showKeyboardHints && (
                      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center" onClick={() => setShowKeyboardHints(false)}>
                        <div className="bg-background border border-border rounded-xl p-6 max-w-md mx-4 shadow-2xl">
                          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Keyboard className="h-5 w-5" />
                            Keyboard Shortcuts
                          </h3>
                          <div className="space-y-3 text-sm">
                            <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                              <span className="text-muted-foreground">Navigate</span>
                              <div className="flex items-center gap-1">
                                <kbd className="px-2 py-0.5 bg-muted rounded text-xs font-mono">←</kbd>
                                <kbd className="px-2 py-0.5 bg-muted rounded text-xs font-mono">→</kbd>
                                <kbd className="px-2 py-0.5 bg-muted rounded text-xs font-mono">↑</kbd>
                                <kbd className="px-2 py-0.5 bg-muted rounded text-xs font-mono">↓</kbd>
                              </div>
                            </div>
                            <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                              <span className="text-muted-foreground">Approve video</span>
                              <kbd className="px-2 py-0.5 bg-green-500/20 text-green-500 rounded text-xs font-mono">A</kbd>
                            </div>
                            <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                              <span className="text-muted-foreground">Reject video</span>
                              <kbd className="px-2 py-0.5 bg-red-500/20 text-red-500 rounded text-xs font-mono">R</kbd>
                            </div>
                            <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                              <span className="text-muted-foreground">Open video</span>
                              <kbd className="px-2 py-0.5 bg-muted rounded text-xs font-mono">O</kbd>
                            </div>
                            <div className="flex items-center justify-between py-1.5">
                              <span className="text-muted-foreground">Close / Deselect</span>
                              <kbd className="px-2 py-0.5 bg-muted rounded text-xs font-mono">Esc</kbd>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground mt-4 text-center">Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">?</kbd> to toggle this menu</p>
                        </div>
                      </div>
                    )}

                    {/* Grid of videos */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                      {filteredVids.map((video, index) => {
                        const isFocused = index === focusedVideoIndex;
                        const thumbnailUrl = video.source === "tracked" ? getTrackedThumbnailUrl(video) || video.video_thumbnail_url : video.video_thumbnail_url;

                        return (
                          <div
                            key={video.id}
                            data-grid-index={index}
                            onClick={() => setFocusedVideoIndex(index)}
                            className={cn(
                              "relative aspect-[9/16] rounded-xl overflow-hidden cursor-pointer transition-all duration-200 group",
                              isFocused ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-[1.02]" : "hover:ring-1 hover:ring-border",
                              video.status === "approved" && "opacity-60"
                            )}
                          >
                            {/* Video Thumbnail */}
                            <VideoPreview
                              thumbnailUrl={thumbnailUrl}
                              fill
                              showPlayIcon={false}
                            />

                            {/* Gradient overlay - pointer-events-none to allow video hover */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

                            {/* Status indicator */}
                            <div className={cn(
                              "absolute top-2 left-2 h-2 w-2 rounded-full pointer-events-none",
                              video.status === "pending" && "bg-yellow-500",
                              video.status === "approved" && "bg-green-500",
                              video.status === "rejected" && "bg-red-500",
                              video.status === "tracked" && "bg-purple-500"
                            )} />

                            {/* Platform badge */}
                            <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center pointer-events-none">
                              <img src={getPlatformLogo(video.platform)} alt="" className="h-3 w-3" />
                            </div>

                            {/* Bot score indicator */}
                            {video.bot_score !== null && video.bot_score > 0 && (
                              <div className={cn(
                                "absolute top-2 right-9 px-1.5 py-0.5 rounded text-[9px] font-bold backdrop-blur-sm pointer-events-none",
                                video.bot_score >= 60 && "bg-red-500/80 text-white",
                                video.bot_score >= 30 && video.bot_score < 60 && "bg-yellow-500/80 text-black",
                                video.bot_score < 30 && "bg-green-500/80 text-white"
                              )}>
                                {video.bot_score.toFixed(0)}%
                              </div>
                            )}

                            {/* Views */}
                            <div className="absolute bottom-12 left-2 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-sm pointer-events-none">
                              <span className="text-[10px] font-medium text-white">{formatNumber(video.views)} views</span>
                            </div>

                            {/* Payout */}
                            <div className="absolute bottom-12 right-2 px-1.5 py-0.5 rounded bg-green-500/80 backdrop-blur-sm pointer-events-none">
                              <span className="text-[10px] font-bold text-white">${getPayoutForSubmission(video).toFixed(0)}</span>
                            </div>

                            {/* Bottom info */}
                            <div className="absolute bottom-0 left-0 right-0 p-2 pointer-events-none">
                              <p className="text-[11px] font-medium text-white truncate">
                                @{video.video_author_username || "Unknown"}
                              </p>
                            </div>

                            {/* Focus indicator with action buttons - keeps pointer events for buttons */}
                            {isFocused && video.status === "pending" && (
                              <div className="absolute inset-x-0 bottom-8 flex items-center justify-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200 z-10">
                                <Button
                                  size="sm"
                                  className="h-8 px-3 text-xs gap-1 bg-green-600 hover:bg-green-700 text-white shadow-lg"
                                  onClick={(e) => { e.stopPropagation(); handleApprove(video); }}
                                  disabled={processing}
                                >
                                  <Check className="h-3 w-3" />
                                  <span className="font-mono text-[10px] opacity-70">A</span>
                                </Button>
                                <Button
                                  size="sm"
                                  className="h-8 px-3 text-xs gap-1 bg-red-600 hover:bg-red-700 text-white shadow-lg"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedSubmission(video);
                                    setRejectDialogOpen(true);
                                  }}
                                  disabled={processing}
                                >
                                  <X className="h-3 w-3" />
                                  <span className="font-mono text-[10px] opacity-70">R</span>
                                </Button>
                              </div>
                            )}

                            {/* Approved/Rejected overlay */}
                            {video.status === "approved" && (
                              <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center pointer-events-none">
                                <Check className="h-8 w-8 text-green-500" />
                              </div>
                            )}
                            {video.status === "rejected" && (
                              <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center pointer-events-none">
                                <X className="h-8 w-8 text-red-500" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Quick stats bar */}
                    <div className="sticky bottom-0 mt-4 p-3 bg-background/95 backdrop-blur-sm border-t border-border flex items-center justify-between text-xs">
                      <div className="flex items-center gap-4">
                        <span className="text-muted-foreground">
                          {focusedVideoIndex >= 0 ? `${focusedVideoIndex + 1} / ${filteredVids.length}` : `${filteredVids.length} videos`}
                        </span>
                        <span className="text-yellow-500">{filteredVids.filter(v => v.status === "pending").length} pending</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <span>Use arrow keys to navigate</span>
                        <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">?</kbd>
                        <span>for shortcuts</span>
                      </div>
                    </div>
                  </div>
                );
              }

              // Card View - Redesigned for cleaner aesthetics
              return filteredVids.map(video => {
                const profile = video.user_id ? profiles[video.user_id] : null;
                const uploadDate = video.uploaded_at || video.submitted_at;
                const isSelected = selectedVideos.has(video.id);
                return <div key={video.id} className={cn("group relative w-full rounded-2xl border bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm overflow-hidden hover:shadow-lg transition-all duration-300 font-sans tracking-[-0.5px]", isSelected ? "border-primary/50 bg-primary/5" : "border-border/30 hover:border-border/60")}>
                      {/* Main Content Row */}
                      <div className="flex gap-3 p-3">
                        {/* Thumbnail with overlay */}
                        <a href={video.video_url} target="_blank" rel="noopener noreferrer" className="relative w-20 h-28 rounded-xl overflow-hidden bg-muted/30 shrink-0 group/thumb">
                          {/* Video Thumbnail */}
                          <VideoPreview
                            thumbnailUrl={video.source === "tracked" ? getTrackedThumbnailUrl(video) || video.video_thumbnail_url : video.video_thumbnail_url}
                            fill
                            showPlayIcon={false}
                          />
                          {/* Platform badge - bottom left */}
                          <div className="absolute bottom-1.5 left-1.5 h-5 w-5 rounded-full bg-background/90 backdrop-blur-sm flex items-center justify-center shadow-sm">
                            <img src={getPlatformLogo(video.platform)} alt={video.platform} className="h-3 w-3" />
                          </div>
                          {/* Views overlay - top right */}
                          <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-sm">
                            <span className="text-[10px] font-medium text-white flex items-center gap-0.5">
                              
                              {formatNumber(video.views)}
                            </span>
                          </div>
                        </a>

                        {/* Content Section */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                          {/* Header */}
                          <div>
                            {/* Title & Username */}
                            <a href={video.video_url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium tracking-[-0.2px] line-clamp-2 hover:underline transition-all leading-tight">
                              {video.video_title || video.video_description || "Untitled Video"}
                            </a>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-muted-foreground">
                                @{video.video_author_username || profile?.username || "Unknown"}
                              </span>
                              <span className="text-muted-foreground/40">•</span>
                              <span className="text-[11px] text-muted-foreground/70">
                                {uploadDate ? formatDistanceToNow(new Date(uploadDate), {
                              addSuffix: true
                            }) : "Unknown"}
                              </span>
                            </div>
                          </div>

                          {/* Stats Row */}
                          <div className="flex items-center gap-3 mt-2">
                            <div className="flex items-center gap-2.5 text-muted-foreground text-xs">
                              <span>{formatNumber(video.likes)} likes</span>
                              <span>•</span>
                              <span>{formatNumber(video.comments)} comments</span>
                            </div>
                            <div className="ml-auto flex items-center gap-1.5">
                              {/* Earnings */}
                              <span className="text-sm font-semibold text-green-500">
                                ${getPayoutForSubmission(video).toFixed(2)}
                              </span>
                              {/* Source indicator */}
                              
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Action Bar - For all pending videos */}
                      {video.status === "pending" && <div className="flex items-center justify-end gap-1.5 px-3 pb-3 pt-1">
                          <Button size="sm" className="h-7 px-5 text-[11px] font-medium gap-1 bg-[#1c823a] hover:bg-[#1c823a]/90 text-white rounded-md shadow-none border-t border-t-[#43954d]" onClick={() => handleApprove(video)} disabled={processing}>
                            <Check className="h-3 w-3" />
                            Approve
                          </Button>
                          <Button size="sm" className="h-7 px-5 text-[11px] font-medium gap-1 bg-[#b60b0b] hover:bg-[#b60b0b]/90 text-white rounded-md shadow-none border-t border-t-[#ed3030]" onClick={() => {
                      setSelectedSubmission(video);
                      setRejectDialogOpen(true);
                    }} disabled={processing}>
                            <X className="h-3 w-3" />
                            Reject
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50" onClick={() => handleRefreshMetadata(video)} disabled={processing}>
                            <RefreshCw className="h-3.5 w-3.5" />
                          </Button>
                        </div>}

                      {video.status === "approved" && <div className="px-3 pb-3 pt-1">
                          <Button size="sm" variant="ghost" className="h-7 px-3 text-xs gap-1.5 text-muted-foreground hover:text-foreground rounded-lg" onClick={() => handleRevertApproval(video)} disabled={processing}>
                            <RotateCcw className="h-3 w-3" />
                            Revert to Pending
                          </Button>
                        </div>}

                    </div>;
              });
            })()}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Floating Bulk Actions Bar */}
      {selectedVideos.size > 0 && (() => {
      // Get selected video objects to check their statuses
      const selectedVideoObjects = allVideos.filter(v => selectedVideos.has(v.id));
      const hasApprovable = selectedVideoObjects.some(v => v.status !== 'approved' && v.user_id);
      const hasRejectable = selectedVideoObjects.some(v => v.status !== 'rejected');
      return <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 bg-background/95 backdrop-blur-md border border-border/60 rounded-xl shadow-xl flex items-center gap-4 font-inter tracking-[-0.5px]">
            <span className="text-sm">
              <span className="font-semibold text-foreground">{selectedVideos.size}</span>
              <span className="text-muted-foreground/70"> video{selectedVideos.size > 1 ? 's' : ''} selected</span>
            </span>
            <div className="h-4 w-px bg-border/50" />
            <div className="flex items-center gap-2">
              {hasApprovable && <Button size="sm" className="h-8 px-4 text-xs font-medium gap-1.5 bg-[#1c823a] hover:bg-[#1c823a]/90 text-white border-t border-t-[#43954d] rounded-sm shadow-none tracking-[-0.3px]" onClick={handleBulkApprove} disabled={processing}>
                  <Check className="h-3.5 w-3.5" />
                  Approve{selectedVideos.size > 1 ? ' All' : ''}
                </Button>}
              {hasRejectable && <Button size="sm" className="h-8 px-4 text-xs font-medium gap-1.5 bg-[#b60b0b] hover:bg-[#b60b0b]/90 text-white border-t border-t-[#ed3030] rounded-sm shadow-none tracking-[-0.3px]" onClick={handleBulkReject} disabled={processing}>
                  <X className="h-3.5 w-3.5" />
                  Reject{selectedVideos.size > 1 ? ' All' : ''}
                </Button>}
              <Button size="sm" variant="ghost" className="h-8 px-3 text-xs font-medium text-muted-foreground hover:text-foreground rounded-lg tracking-[-0.3px]" onClick={() => setSelectedVideos(new Set())}>
                Clear
              </Button>
            </div>
          </div>;
    })()}

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Video</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this video submission.
            </DialogDescription>
          </DialogHeader>
          <Textarea placeholder="Reason for rejection (optional)" value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} className="min-h-[100px]" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={processing}>
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>;
}