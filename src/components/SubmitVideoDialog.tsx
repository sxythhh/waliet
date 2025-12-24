import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Video, DollarSign, ExternalLink } from "lucide-react";
import tiktokLogo from "@/assets/tiktok-logo-white.png";
import instagramLogo from "@/assets/instagram-logo-white.png";
import youtubeLogo from "@/assets/youtube-logo-white.png";

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

const PLATFORM_CONFIG: Record<string, { logo: string; label: string; urlPattern: RegExp }> = {
  tiktok: {
    logo: tiktokLogo,
    label: "TikTok",
    urlPattern: /tiktok\.com/i
  },
  instagram: {
    logo: instagramLogo,
    label: "Instagram",
    urlPattern: /instagram\.com/i
  },
  youtube: {
    logo: youtubeLogo,
    label: "YouTube",
    urlPattern: /youtube\.com|youtu\.be/i
  }
};

export function SubmitVideoDialog({ campaign, open, onOpenChange, onSuccess }: SubmitVideoDialogProps) {
  const [videoUrl, setVideoUrl] = useState("");
  const [platform, setPlatform] = useState("");
  const [submissionText, setSubmissionText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const allowedPlatforms = campaign.allowed_platforms || ["tiktok", "instagram", "youtube"];
  const isPayPerPost = campaign.payment_model === "pay_per_post";

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

      // Calculate estimated payout for pay_per_post
      const estimatedPayout = isPayPerPost ? (campaign.post_rate || 0) : null;

      // Insert the video submission
      const { error } = await supabase
        .from("campaign_videos")
        .insert({
          campaign_id: campaign.id,
          creator_id: user.id,
          video_url: videoUrl.trim(),
          platform: platform,
          submission_text: submissionText.trim() || null,
          status: "pending",
          estimated_payout: estimatedPayout
        });

      if (error) throw error;

      toast.success("Video submitted successfully! It will be reviewed shortly.");
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Submit Video
          </DialogTitle>
          <DialogDescription>
Submit your video for {campaign.title} to earn{" "}
            {isPayPerPost ? (
              <span className="font-semibold text-emerald-500">
                ${campaign.post_rate?.toFixed(2)} per approved video
              </span>
            ) : campaign.rpm_rate ? (
              <span className="font-semibold text-emerald-500">
                ${campaign.rpm_rate} per 1K views
              </span>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* Video URL */}
          <div className="space-y-2">
            <Label htmlFor="video-url">Video URL</Label>
            <Input
              id="video-url"
              placeholder="https://www.tiktok.com/@username/video/..."
              value={videoUrl}
              onChange={(e) => handleUrlChange(e.target.value)}
              className="bg-muted/30"
            />
            <p className="text-xs text-muted-foreground">
              Paste the direct link to your video
            </p>
          </div>

          {/* Platform Selection */}
          <div className="space-y-2">
            <Label>Platform</Label>
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger className="bg-muted/30">
                <SelectValue placeholder="Select platform" />
              </SelectTrigger>
              <SelectContent>
                {allowedPlatforms.map((p) => {
                  const config = PLATFORM_CONFIG[p];
                  if (!config) return null;
                  return (
                    <SelectItem key={p} value={p}>
                      <div className="flex items-center gap-2">
                        <img src={config.logo} alt={config.label} className="h-4 w-4" />
                        {config.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Optional Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any notes about your submission..."
              value={submissionText}
              onChange={(e) => setSubmissionText(e.target.value)}
              className="bg-muted/30 min-h-[80px]"
            />
          </div>

          {/* Payout Info */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-500" />
              <span className="text-sm font-medium">
                {isPayPerPost ? "Payout on Approval" : "Earnings Based on Views"}
              </span>
            </div>
<span className="text-sm font-bold text-emerald-500">
              {isPayPerPost ? `$${campaign.post_rate?.toFixed(2)}` : campaign.rpm_rate ? `$${campaign.rpm_rate}/1K` : "View-based"}
            </span>
          </div>

          {/* Submit Button */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !videoUrl || !platform}
              className="flex-1"
            >
              {isSubmitting ? "Submitting..." : "Submit Video"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
