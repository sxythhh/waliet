import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Link2, CheckCircle2, X, Loader2, AlertCircle } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import tiktokLogo from "@/assets/tiktok-logo-white.png";
import tiktokLogoBlack from "@/assets/tiktok-logo-black-new.png";
import instagramLogo from "@/assets/instagram-logo-white.png";
import instagramLogoBlack from "@/assets/instagram-logo-black.png";
import youtubeLogo from "@/assets/youtube-logo-white.png";
import youtubeLogoBlack from "@/assets/youtube-logo-black-new.png";
interface SubmissionSource {
  id: string;
  title: string;
  brand_name?: string;
  payment_model?: string | null;
  rpm_rate?: number;
  post_rate?: number | null;
  allowed_platforms?: string[];
  guidelines?: string | null;
  sourceType: 'campaign' | 'boost';
}

// Legacy Campaign interface for backwards compatibility
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
  campaign?: Campaign;
  source?: SubmissionSource;
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
  source,
  open,
  onOpenChange,
  onSuccess
}: SubmitVideoDialogProps) {
  // Support both legacy campaign prop and new source prop
  const submissionSource: SubmissionSource = source || {
    ...campaign!,
    sourceType: 'campaign'
  };
  const [videoUrl, setVideoUrl] = useState("");
  const [platform, setPlatform] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const {
    resolvedTheme
  } = useTheme();
  const allowedPlatforms = submissionSource.allowed_platforms || ["tiktok", "instagram", "youtube"];
  const isPayPerPost = submissionSource.payment_model === "pay_per_post";
  const isBoost = submissionSource.sourceType === 'boost';
  const isLightMode = resolvedTheme === "light";

  // Fetch user's social accounts
  useEffect(() => {
    const fetchAccounts = async () => {
      setLoadingAccounts(true);
      try {
        const {
          data: {
            user
          }
        } = await supabase.auth.getUser();
        if (!user) return;
        const {
          data,
          error
        } = await supabase.from("social_accounts").select("id, platform, username, avatar_url, follower_count").eq("user_id", user.id).in("platform", allowedPlatforms);
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
        const {
          data,
          error
        } = await supabase.functions.invoke('fetch-tiktok-video', {
          body: {
            videoUrl: url
          }
        });
        if (error) throw error;
        return data?.data || null;
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
        return data?.data || null;
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
            shares: 0
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
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to submit videos");
        return;
      }

      // Get the selected account username
      const selectedAccount = socialAccounts.find(acc => acc.id === selectedAccountId);
      if (!selectedAccount) {
        toast.error("Selected account not found");
        setIsSubmitting(false);
        return;
      }

      // Fetch video details from API
      const videoDetails = await fetchVideoDetails(videoUrl.trim());

      // Validate that the video author matches the selected account
      if (videoDetails && videoDetails.authorUsername) {
        const videoAuthor = videoDetails.authorUsername.toLowerCase().replace('@', '');
        const accountUsername = selectedAccount.username.toLowerCase().replace('@', '');
        if (videoAuthor !== accountUsername) {
          toast.error(`This video belongs to @${videoDetails.authorUsername}, not your account @${selectedAccount.username}`);
          setIsSubmitting(false);
          return;
        }
      }

      // Check if video URL already submitted
      const {
        data: existing
      } = await supabase.from("video_submissions").select("id").eq("source_id", submissionSource.id).eq("video_url", videoUrl.trim()).maybeSingle();
      if (existing) {
        toast.error("This video has already been submitted");
        setIsSubmitting(false);
        return;
      }

      // Get brand_id based on source type
      let brandId: string | null = null;
      if (isBoost) {
        const {
          data: boostData
        } = await supabase.from("bounty_campaigns").select("brand_id").eq("id", submissionSource.id).single();
        brandId = boostData?.brand_id || null;
      } else {
        const {
          data: campaignData
        } = await supabase.from("campaigns").select("brand_id").eq("id", submissionSource.id).single();
        brandId = campaignData?.brand_id || null;
      }

      // Calculate estimated payout
      const estimatedPayout = isPayPerPost ? submissionSource.post_rate || 0 : null;

      // Insert into video_submissions table (unified table)
      const {
        error
      } = await supabase.from("video_submissions").insert({
        source_type: submissionSource.sourceType,
        source_id: submissionSource.id,
        brand_id: brandId,
        creator_id: user.id,
        video_url: videoUrl.trim(),
        platform: platform,
        status: "pending",
        payout_amount: estimatedPayout,
        submitted_at: new Date().toISOString(),
        // Link to the social account used for submission
        social_account_id: selectedAccountId || null,
        // Add video metadata if fetched
        ...(videoDetails && {
          views: videoDetails.views || 0,
          likes: videoDetails.likes || 0,
          comments: videoDetails.comments || 0,
          shares: videoDetails.shares || 0,
          video_description: videoDetails.description || null,
          video_thumbnail_url: videoDetails.coverUrl || null,
          video_author_username: videoDetails.authorUsername || null,
          video_author_avatar: videoDetails.authorAvatar || null,
          video_title: videoDetails.title || null,
          video_upload_date: videoDetails.uploadDate || null
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
  const filteredAccounts = platform ? socialAccounts.filter(acc => acc.platform === platform) : socialAccounts;
  return <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl p-0 overflow-hidden gap-0">
        <div className="flex flex-col md:flex-row">
          {/* Left Side - Submission Checklist */}
          <div className="w-full md:w-[320px] bg-[#0a0a0a] p-6 text-white shrink-0">
            <h2 className="text-lg font-semibold mb-3 tracking-[-0.5px]" style={{
            fontFamily: 'Inter'
          }}>
              Submission checklist
            </h2>
            <p className="text-sm text-white/70 mb-6 leading-relaxed tracking-[-0.3px]" style={{
            fontFamily: 'Inter'
          }}>
              Please ensure you adhere to all the rules and requirements before submitting to maximize your chance of approval.
            </p>

            {submissionSource.guidelines && <>
                
                
              </>}

            <div className="border-t border-white/10 pt-6 mt-auto">
              <h3 className="text-sm font-semibold mb-2 tracking-[-0.3px]" style={{
              fontFamily: 'Inter'
            }}>
                Important
              </h3>
              <p className="text-sm text-white/70 leading-relaxed tracking-[-0.3px]" style={{
              fontFamily: 'Inter'
            }}>
                Videos must be posted within <span className="font-semibold text-white">30 minutes</span> of uploading to be eligible. Older videos will be automatically rejected.
              </p>
            </div>
          </div>

          {/* Right Side - Form */}
          <div className="flex-1 p-6 relative">
            {/* Close Button */}
            <button onClick={() => onOpenChange(false)} className="absolute right-4 top-4 rounded-full p-1.5 opacity-60 hover:opacity-100 hover:bg-muted transition-all">
              <X className="w-4 h-4" />
              <span className="sr-only">Close</span>
            </button>

            <div className="space-y-5">
              {/* Account Selection - First */}
              <div className="space-y-2">
                <label className="text-sm font-medium tracking-[-0.3px] flex items-center gap-1" style={{
                fontFamily: 'Inter'
              }}>
                  Your Account <span className="text-[#2060df]">*</span>
                </label>
                {loadingAccounts ? <div className="h-12 bg-muted/30 border border-border/50 rounded-xl flex items-center justify-center">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  </div> : filteredAccounts.length === 0 ? <div className="h-12 bg-muted/30 border border-border/50 rounded-xl flex items-center gap-2 px-3">
                    <AlertCircle className="w-4 h-4 text-[#2060df]" />
                    <span className="text-sm text-muted-foreground" style={{
                  fontFamily: 'Inter',
                  letterSpacing: '-0.3px'
                }}>
                      {platform ? `No ${PLATFORM_CONFIG[platform]?.label || platform} accounts connected` : 'Select a platform first by entering a video URL'}
                    </span>
                  </div> : <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                    <SelectTrigger className="h-12 bg-muted/30 border-border/50 rounded-xl focus:border-[#2060df]/50 focus:ring-[#2060df]/20">
                      <SelectValue placeholder="Select your account" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border-border">
                      {filteredAccounts.map(account => <SelectItem key={account.id} value={account.id}>
                          <div className="flex items-center gap-2">
                            <img src={getPlatformLogo(account.platform) || ''} alt={account.platform} className="w-4 h-4" />
                            <span className="text-sm" style={{
                        fontFamily: 'Inter',
                        letterSpacing: '-0.3px'
                      }}>
                              @{account.username}
                            </span>
                          </div>
                        </SelectItem>)}
                    </SelectContent>
                  </Select>}
              </div>

              {/* Video URL Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium tracking-[-0.3px] flex items-center gap-1" style={{
                fontFamily: 'Inter'
              }}>
                  Link <span className="text-[#2060df]">*</span>
                </label>
                <div className="relative">
                  <Input placeholder="https://tiktok.com/@username/video/..." value={videoUrl} onChange={e => handleUrlChange(e.target.value)} className="h-12 bg-muted/30 border-border/50 rounded-xl text-sm focus:border-[#2060df]/50 focus:ring-[#2060df]/20" style={{
                  fontFamily: 'Inter',
                  letterSpacing: '-0.3px'
                }} />
                  {videoUrl && validateUrl(videoUrl) && <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    </div>}
                </div>
              </div>

              {/* Acknowledgment Checkbox */}
              <div className="flex items-start gap-3 p-4 bg-muted/20 border border-border/50 rounded-xl">
                <Checkbox id="acknowledge" checked={acknowledged} onCheckedChange={checked => setAcknowledged(checked === true)} className="mt-0.5 border-muted-foreground/50 data-[state=checked]:bg-[#2060df] data-[state=checked]:border-[#2060df]" />
                <label htmlFor="acknowledge" className="text-sm text-muted-foreground leading-relaxed cursor-pointer" style={{
                fontFamily: 'Inter',
                letterSpacing: '-0.3px'
              }}>
                  I've read the submission requirements and acknowledge my submission(s) may be auto-rejected if they do not adhere to them
                </label>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end pt-2">
                <Button onClick={handleSubmit} disabled={isSubmitting || !videoUrl || !platform || !selectedAccountId || !acknowledged} className="h-11 px-6 rounded-xl font-semibold bg-[#2060df] hover:bg-[#1a4db8] text-white border-t border-[#4b85f7] font-['Inter'] tracking-[-0.5px]">
                  {isSubmitting ? <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Submitting...
                    </span> : isFetchingDetails ? <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Fetching details...
                    </span> : "Submit video"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>;
}