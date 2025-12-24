import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Video, Link2, CheckCircle2, Sparkles } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
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
  const [submissionText, setSubmissionText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    resolvedTheme
  } = useTheme();
  const allowedPlatforms = campaign.allowed_platforms || ["tiktok", "instagram", "youtube"];
  const isPayPerPost = campaign.payment_model === "pay_per_post";
  const isLightMode = resolvedTheme === "light";

  // Auto-detect platform from URL
  const detectPlatform = (url: string) => {
    for (const [key, config] of Object.entries(PLATFORM_CONFIG)) {
      if (config.urlPattern.test(url)) {
        if (allowedPlatforms.includes(key)) {
          setPlatform(key);
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

      // Check if video URL already submitted
      const {
        data: existing
      } = await supabase.from("campaign_videos").select("id").eq("campaign_id", campaign.id).eq("video_url", videoUrl.trim()).maybeSingle();
      if (existing) {
        toast.error("This video has already been submitted");
        setIsSubmitting(false);
        return;
      }

      // Calculate estimated payout for pay_per_post
      const estimatedPayout = isPayPerPost ? campaign.post_rate || 0 : null;

      // Insert the video submission
      const {
        error
      } = await supabase.from("campaign_videos").insert({
        campaign_id: campaign.id,
        creator_id: user.id,
        video_url: videoUrl.trim(),
        platform: platform,
        submission_text: submissionText.trim() || null,
        status: "pending",
        estimated_payout: estimatedPayout
      });
      if (error) throw error;
      toast.success("Video submitted successfully!");
      setVideoUrl("");
      setPlatform("");
      setSubmissionText("");
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
  return <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
        {/* Header */}
        <div className="p-6 pb-0">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-[#2060df]/10 flex items-center justify-center">
              <Video className="w-5 h-5 text-[#2060df]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold" style={{
              fontFamily: 'Inter',
              letterSpacing: '-0.5px'
            }}>
                Submit Video
              </h2>
              <p className="text-xs text-muted-foreground" style={{
              fontFamily: 'Inter',
              letterSpacing: '-0.3px'
            }}>
                {campaign.brand_name || campaign.title}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 pt-4 space-y-5">
          {/* Earnings Banner */}
          

          {/* Video URL Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium" style={{
            fontFamily: 'Inter',
            letterSpacing: '-0.3px'
          }}>
              Video Link
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2">
                <Link2 className="w-4 h-4 text-muted-foreground" />
              </div>
              <Input placeholder="Paste your video URL here..." value={videoUrl} onChange={e => handleUrlChange(e.target.value)} className="pl-10 h-12 bg-muted/30 border-border/50 rounded-xl text-sm" style={{
              fontFamily: 'Inter',
              letterSpacing: '-0.3px'
            }} />
              {videoUrl && validateUrl(videoUrl) && <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                </div>}
            </div>
          </div>

          {/* Platform Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium" style={{
            fontFamily: 'Inter',
            letterSpacing: '-0.3px'
          }}>
              Platform
            </label>
            <div className="flex gap-2">
              {allowedPlatforms.map(p => {
              const config = PLATFORM_CONFIG[p];
              if (!config) return null;
              const isSelected = platform === p;
              return <button key={p} type="button" onClick={() => setPlatform(p)} className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border transition-all ${isSelected ? 'bg-[#2060df]/10 border-[#2060df]/50 ring-1 ring-[#2060df]/30' : 'bg-muted/30 border-border/50 hover:bg-muted/50'}`}>
                    <img src={getPlatformLogo(p) || ''} alt={config.label} className="w-5 h-5" />
                    <span className={`text-sm font-medium ${isSelected ? 'text-[#2060df]' : 'text-foreground'}`} style={{
                  fontFamily: 'Inter',
                  letterSpacing: '-0.3px'
                }}>
                      {config.label}
                    </span>
                  </button>;
            })}
            </div>
          </div>

          {/* Optional Notes */}
          <div className="space-y-2">
            <label className="text-sm font-medium" style={{
            fontFamily: 'Inter',
            letterSpacing: '-0.3px'
          }}>
              Notes <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <Textarea placeholder="Add any additional context..." value={submissionText} onChange={e => setSubmissionText(e.target.value)} className="bg-muted/30 border-border/50 rounded-xl min-h-[80px] text-sm resize-none" style={{
            fontFamily: 'Inter',
            letterSpacing: '-0.3px'
          }} />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 h-12 rounded-xl font-medium" style={{
            fontFamily: 'Inter',
            letterSpacing: '-0.3px'
          }} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting || !videoUrl || !platform} className="flex-1 h-12 rounded-xl font-semibold bg-[#2060df] hover:bg-[#1a4db8] text-white border-t border-[#4b85f7]" style={{
            fontFamily: 'Inter',
            letterSpacing: '-0.3px'
          }}>
              {isSubmitting ? <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Submitting...
                </span> : "Submit Video"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>;
}