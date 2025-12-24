import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Link2, CheckCircle2, X, Loader2, AlertCircle } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import tiktokLogo from "@/assets/tiktok-logo-white.png";
import tiktokLogoBlack from "@/assets/tiktok-logo-black-new.png";
import instagramLogo from "@/assets/instagram-logo-white.png";
import instagramLogoBlack from "@/assets/instagram-logo-black.png";
import youtubeLogo from "@/assets/youtube-logo-white.png";
import youtubeLogoBlack from "@/assets/youtube-logo-black-new.png";

interface Campaign {
  id: string;
  title: string;
  brand_name?: string;
  payment_model?: string | null;
  rpm_rate?: number;
  post_rate?: number | null;
  allowed_platforms?: string[];
  guidelines?: string | null;
}

interface SocialAccount {
  id: string;
  platform: string;
  username: string;
  avatar_url: string | null;
  follower_count: number | null;
}

interface SubmitVideoDialogProps {
  campaign: Campaign;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const PLATFORM_CONFIG: Record<string, {
  logo: string;
  logoDark: string;
  label: string;
  urlPattern: RegExp;
  color: string;
}> = {
  tiktok: {
    logo: tiktokLogoBlack,
    logoDark: tiktokLogo,
    label: "TikTok",
    urlPattern: /tiktok\.com/i,
    color: "#000000"
  },
  instagram: {
    logo: instagramLogoBlack,
    logoDark: instagramLogo,
    label: "Instagram",
    urlPattern: /instagram\.com/i,
    color: "#E1306C"
  },
  youtube: {
    logo: youtubeLogoBlack,
    logoDark: youtubeLogo,
    label: "YouTube",
    urlPattern: /youtube\.com|youtu\.be/i,
    color: "#FF0000"
  }
};

export function SubmitVideoDialog({
  campaign,
  open,
  onOpenChange,
  onSuccess
}: SubmitVideoDialogProps) {
  const [videoUrl, setVideoUrl] = useState("");
  const [platform, setPlatform] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const { resolvedTheme } = useTheme();

  const allowedPlatforms = campaign.allowed_platforms || ["tiktok", "instagram", "youtube"];
  const isPayPerPost = campaign.payment_model === "pay_per_post";
  const isLightMode = resolvedTheme === "light";

  // Fetch user's social accounts
  useEffect(() => {
    const fetchAccounts = async () => {
      setLoadingAccounts(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from("social_accounts")
          .select("id, platform, username, avatar_url, follower_count")
          .eq("user_id", user.id)
          .in("platform", allowedPlatforms);

        if (error) throw error;
        setSocialAccounts(data || []);
      } catch (error) {
        console.error("Error fetching social accounts:", error);
      } finally {
        setLoadingAccounts(false);
      }
    };

    if (open) {
      fetchAccounts();
    }
  }, [open, allowedPlatforms]);

  // Auto-detect platform from URL
  const detectPlatform = (url: string) => {
    for (const [key, config] of Object.entries(PLATFORM_CONFIG)) {
      if (config.urlPattern.test(url)) {
        if (allowedPlatforms.includes(key)) {
          setPlatform(key);
          // Auto-select first matching account
          const matchingAccount = socialAccounts.find(acc => acc.platform === key);
          if (matchingAccount && !selectedAccountId) {
            setSelectedAccountId(matchingAccount.id);
          }
        }
        break;
      }
    }
  };

  const handleUrlChange = (url: string) => {
    setVideoUrl(url);
    detectPlatform(url);
  };

  const validateUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  // Fetch video details from TikTok, Instagram, or YouTube API
  const fetchVideoDetails = async (url: string) => {
    setIsFetchingDetails(true);
    try {
      if (url.includes('tiktok.com')) {
        const { data, error } = await supabase.functions.invoke('fetch-tiktok-video', {
          body: { videoUrl: url }
        });
        if (error) throw error;
        return data?.data || null;
      } else if (url.includes('instagram.com')) {
        const { data, error } = await supabase.functions.invoke('fetch-instagram-post', {
          body: { postUrl: url }
        });
        if (error) throw error;
        return data?.data || null;
      } else if (url.includes('youtube.com') || url.includes('youtu.be')) {
        const { data, error } = await supabase.functions.invoke('fetch-youtube-video', {
          body: { videoUrl: url }
        });
        if (error) throw error;
        // Map YouTube response to common format
        if (data) {
          return {
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
        return null;
      }
      return null; // Platform not supported
    } catch (error) {
      console.error("Error fetching video details:", error);
      return null;
    } finally {
      setIsFetchingDetails(false);
    }
  };

  const handleSubmit = async () => {
    if (!videoUrl.trim()) {
      toast.error("Please enter a video URL");
      return;
    }
    if (!validateUrl(videoUrl)) {
      toast.error("Please enter a valid URL");
      return;
    }
    if (!platform) {
      toast.error("Please select a platform");
      return;
    }
    if (!selectedAccountId) {
      toast.error("Please select your account");
      return;
    }
    if (!acknowledged) {
      toast.error("Please acknowledge the submission requirements");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to submit videos");
        return;
      }

      // Check if video URL already submitted
      const { data: existing } = await supabase
        .from("campaign_videos")
        .select("id")
        .eq("campaign_id", campaign.id)
        .eq("video_url", videoUrl.trim())
        .maybeSingle();

      if (existing) {
        toast.error("This video has already been submitted");
        setIsSubmitting(false);
        return;
      }

      // Fetch video details from TikTok API
      const videoDetails = await fetchVideoDetails(videoUrl.trim());

      // Calculate estimated payout for pay_per_post
      const estimatedPayout = isPayPerPost ? campaign.post_rate || 0 : null;

      // Insert the video submission
      const { error } = await supabase.from("campaign_videos").insert({
        campaign_id: campaign.id,
        creator_id: user.id,
        video_url: videoUrl.trim(),
        platform: platform,
        social_account_id: selectedAccountId,
        status: "pending",
        estimated_payout: estimatedPayout,
        // Add video metadata if fetched
        ...(videoDetails && {
          video_description: videoDetails.description,
          video_cover_url: videoDetails.coverUrl,
          video_author_username: videoDetails.authorUsername,
          video_author_avatar: videoDetails.authorAvatar,
          video_upload_date: videoDetails.uploadDate,
          video_views: videoDetails.views,
          video_likes: videoDetails.likes,
          video_comments: videoDetails.comments,
          video_shares: videoDetails.shares,
        })
      });

      if (error) throw error;

      toast.success("Video submitted successfully!");
      setVideoUrl("");
      setPlatform("");
      setSelectedAccountId("");
      setAcknowledged(false);
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("Error submitting video:", error);
      toast.error(error.message || "Failed to submit video");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPlatformLogo = (key: string) => {
    const config = PLATFORM_CONFIG[key];
    if (!config) return null;
    return isLightMode ? config.logo : config.logoDark;
  };

  // Filter accounts by selected platform
  const filteredAccounts = platform 
    ? socialAccounts.filter(acc => acc.platform === platform)
    : socialAccounts;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl p-0 overflow-hidden gap-0">
        <div className="flex flex-col md:flex-row">
          {/* Left Side - Submission Checklist */}
          <div className="w-full md:w-[320px] bg-[#0a0a0a] p-6 text-white shrink-0">
            <h2 className="text-lg font-semibold mb-3 tracking-[-0.5px]" style={{ fontFamily: 'Inter' }}>
              Submission checklist
            </h2>
            <p className="text-sm text-white/70 mb-6 leading-relaxed tracking-[-0.3px]" style={{ fontFamily: 'Inter' }}>
              Please ensure you adhere to all the rules and requirements before submitting to maximize your chance of approval.
            </p>

            {campaign.guidelines && (
              <>
                <h3 className="text-sm font-semibold mb-2 tracking-[-0.3px]" style={{ fontFamily: 'Inter' }}>
                  General
                </h3>
                <p className="text-sm text-white/90 mb-6 uppercase font-medium tracking-[-0.3px]" style={{ fontFamily: 'Inter' }}>
                  {campaign.guidelines}
                </p>
              </>
            )}

            <div className="border-t border-white/10 pt-6 mt-auto">
              <h3 className="text-sm font-semibold mb-2 tracking-[-0.3px]" style={{ fontFamily: 'Inter' }}>
                Important
              </h3>
              <p className="text-sm text-white/70 leading-relaxed tracking-[-0.3px]" style={{ fontFamily: 'Inter' }}>
                Videos must be posted within <span className="font-semibold text-white">30 minutes</span> of uploading to be eligible. Older videos will be automatically rejected.
              </p>
            </div>
          </div>

          {/* Right Side - Form */}
          <div className="flex-1 p-6 relative">
            {/* Close Button */}
            <button
              onClick={() => onOpenChange(false)}
              className="absolute right-4 top-4 rounded-full p-1.5 opacity-60 hover:opacity-100 hover:bg-muted transition-all"
            >
              <X className="w-4 h-4" />
              <span className="sr-only">Close</span>
            </button>

            <div className="space-y-5">
              {/* Account Selection - First */}
              <div className="space-y-2">
                <label className="text-sm font-medium tracking-[-0.3px] flex items-center gap-1" style={{ fontFamily: 'Inter' }}>
                  Your Account <span className="text-[#2060df]">*</span>
                </label>
                {loadingAccounts ? (
                  <div className="h-12 bg-muted/30 border border-border/50 rounded-xl flex items-center justify-center">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredAccounts.length === 0 ? (
                  <div className="h-12 bg-muted/30 border border-border/50 rounded-xl flex items-center gap-2 px-3">
                    <AlertCircle className="w-4 h-4 text-[#2060df]" />
                    <span className="text-sm text-muted-foreground" style={{ fontFamily: 'Inter', letterSpacing: '-0.3px' }}>
                      {platform ? `No ${PLATFORM_CONFIG[platform]?.label || platform} accounts connected` : 'Select a platform first by entering a video URL'}
                    </span>
                  </div>
                ) : (
                  <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                    <SelectTrigger className="h-12 bg-muted/30 border-border/50 rounded-xl focus:border-[#2060df]/50 focus:ring-[#2060df]/20">
                      <SelectValue placeholder="Select your account" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border-border">
                      {filteredAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          <div className="flex items-center gap-2">
                            <Avatar className="w-5 h-5">
                              <AvatarImage src={account.avatar_url || ''} />
                              <AvatarFallback className="text-xs">
                                {account.username.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm" style={{ fontFamily: 'Inter', letterSpacing: '-0.3px' }}>
                              @{account.username}
                            </span>
                            {account.follower_count && (
                              <span className="text-xs text-muted-foreground">
                                ({(account.follower_count / 1000).toFixed(1)}K)
                              </span>
                            )}
                            <img
                              src={getPlatformLogo(account.platform) || ''}
                              alt={account.platform}
                              className="w-4 h-4 ml-1"
                            />
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Video URL Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium tracking-[-0.3px] flex items-center gap-1" style={{ fontFamily: 'Inter' }}>
                  Link <span className="text-[#2060df]">*</span>
                </label>
                <div className="relative">
                  <Input
                    placeholder="https://tiktok.com/@username/video/..."
                    value={videoUrl}
                    onChange={(e) => handleUrlChange(e.target.value)}
                    className="h-12 bg-muted/30 border-border/50 rounded-xl text-sm focus:border-[#2060df]/50 focus:ring-[#2060df]/20"
                    style={{ fontFamily: 'Inter', letterSpacing: '-0.3px' }}
                  />
                  {videoUrl && validateUrl(videoUrl) && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    </div>
                  )}
                </div>
              </div>

              {/* Acknowledgment Checkbox */}
              <div className="flex items-start gap-3 p-4 bg-muted/20 border border-border/50 rounded-xl">
                <Checkbox
                  id="acknowledge"
                  checked={acknowledged}
                  onCheckedChange={(checked) => setAcknowledged(checked === true)}
                  className="mt-0.5 border-muted-foreground/50 data-[state=checked]:bg-[#2060df] data-[state=checked]:border-[#2060df]"
                />
                <label
                  htmlFor="acknowledge"
                  className="text-sm text-muted-foreground leading-relaxed cursor-pointer"
                  style={{ fontFamily: 'Inter', letterSpacing: '-0.3px' }}
                >
                  I've read the submission requirements and acknowledge my submission(s) may be auto-rejected if they do not adhere to them
                </label>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end pt-2">
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !videoUrl || !platform || !selectedAccountId || !acknowledged}
                  className="h-11 px-6 rounded-xl font-semibold bg-[#2060df] hover:bg-[#1a4db8] text-white border-t border-[#4b85f7]"
                  style={{ fontFamily: 'Inter', letterSpacing: '-0.3px' }}
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Submitting...
                    </span>
                  ) : isFetchingDetails ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Fetching details...
                    </span>
                  ) : (
                    "Submit for approval"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
