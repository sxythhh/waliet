import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Icon } from "@iconify/react";
import { cn } from "@/lib/utils";
import { CheckCircle2, ExternalLink, AlertCircle } from "lucide-react";

interface Platform {
  key: "tiktok" | "instagram" | "youtube";
  status: string;
}

interface MarkAsPostedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  platforms: Platform[];
  onSubmit: (urls: { tiktok?: string; instagram?: string; youtube?: string }) => Promise<void>;
  submissionCaption?: string | null;
}

const PLATFORM_CONFIG = {
  tiktok: {
    icon: "logos:tiktok-icon",
    label: "TikTok",
    placeholder: "https://www.tiktok.com/@username/video/...",
    pattern: /^https?:\/\/(www\.)?tiktok\.com\/@[\w.-]+\/video\/\d+/i,
    hint: "Paste the TikTok video URL",
  },
  instagram: {
    icon: "skill-icons:instagram",
    label: "Instagram",
    placeholder: "https://www.instagram.com/reel/... or /p/...",
    pattern: /^https?:\/\/(www\.)?instagram\.com\/(reel|p)\/[\w-]+/i,
    hint: "Paste the Instagram Reel or Post URL",
  },
  youtube: {
    icon: "logos:youtube-icon",
    label: "YouTube",
    placeholder: "https://youtube.com/shorts/... or youtube.com/watch?v=...",
    pattern: /^https?:\/\/(www\.)?(youtube\.com\/(watch\?v=|shorts\/)|youtu\.be\/)[\w-]+/i,
    hint: "Paste the YouTube Shorts or video URL",
  },
};

export function MarkAsPostedDialog({
  open,
  onOpenChange,
  platforms,
  onSubmit,
  submissionCaption,
}: MarkAsPostedDialogProps) {
  const [urls, setUrls] = useState<{ tiktok: string; instagram: string; youtube: string }>({
    tiktok: "",
    instagram: "",
    youtube: "",
  });
  const [errors, setErrors] = useState<{ tiktok?: string; instagram?: string; youtube?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  // Filter to only show platforms that need to be posted
  const platformsToPost = platforms.filter(
    (p) => p.status === "ready_to_post" || p.status === "approved"
  );

  const validateUrl = (platform: "tiktok" | "instagram" | "youtube", url: string): string | undefined => {
    if (!url.trim()) {
      return "URL is required";
    }
    const config = PLATFORM_CONFIG[platform];
    if (!config.pattern.test(url.trim())) {
      return `Please enter a valid ${config.label} URL`;
    }
    return undefined;
  };

  const handleUrlChange = (platform: "tiktok" | "instagram" | "youtube", value: string) => {
    setUrls((prev) => ({ ...prev, [platform]: value }));
    // Clear error when user starts typing
    if (errors[platform]) {
      setErrors((prev) => ({ ...prev, [platform]: undefined }));
    }
  };

  const handleSubmit = async () => {
    // Validate all required URLs
    const newErrors: typeof errors = {};
    platformsToPost.forEach((p) => {
      const error = validateUrl(p.key, urls[p.key]);
      if (error) {
        newErrors[p.key] = error;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSubmitting(true);
    try {
      const urlsToSubmit: { tiktok?: string; instagram?: string; youtube?: string } = {};
      platformsToPost.forEach((p) => {
        urlsToSubmit[p.key] = urls[p.key].trim();
      });
      await onSubmit(urlsToSubmit);
      // Reset state on success
      setUrls({ tiktok: "", instagram: "", youtube: "" });
      setErrors({});
      onOpenChange(false);
    } catch (error) {
      // Error handled by parent
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset state when closing
      setUrls({ tiktok: "", instagram: "", youtube: "" });
      setErrors({});
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="font-geist tracking-[-0.5px] flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            Mark as Posted
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground font-inter tracking-[-0.3px]">
            Enter the URLs where this video was posted to verify publication.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Caption Preview */}
          {submissionCaption && (
            <div className="p-3 rounded-lg bg-muted/30 border border-border/40">
              <p className="text-[10px] uppercase text-muted-foreground font-medium tracking-wide mb-1">
                Caption
              </p>
              <p className="text-sm text-foreground/80 font-inter line-clamp-2">
                {submissionCaption}
              </p>
            </div>
          )}

          {/* Platform URL Inputs */}
          <div className="space-y-3">
            {platformsToPost.map((platform) => {
              const config = PLATFORM_CONFIG[platform.key];
              const hasError = !!errors[platform.key];
              const hasValue = !!urls[platform.key].trim();

              return (
                <div key={platform.key} className="space-y-1.5">
                  <Label className="flex items-center gap-2 text-sm font-medium font-inter">
                    <Icon icon={config.icon} className="w-4 h-4" />
                    {config.label}
                  </Label>
                  <div className="relative">
                    <Input
                      value={urls[platform.key]}
                      onChange={(e) => handleUrlChange(platform.key, e.target.value)}
                      placeholder={config.placeholder}
                      className={cn(
                        "pr-10 font-inter text-sm",
                        hasError && "border-red-500 focus-visible:ring-red-500"
                      )}
                    />
                    {hasValue && !hasError && (
                      <a
                        href={urls[platform.key]}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                    {hasError && (
                      <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500" />
                    )}
                  </div>
                  {hasError ? (
                    <p className="text-xs text-red-500 font-inter">{errors[platform.key]}</p>
                  ) : (
                    <p className="text-[11px] text-muted-foreground font-inter">{config.hint}</p>
                  )}
                </div>
              );
            })}
          </div>

          {platformsToPost.length === 0 && (
            <div className="text-center py-6 text-muted-foreground">
              <p className="text-sm font-inter">No platforms ready to be marked as posted.</p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="ghost"
            onClick={() => handleOpenChange(false)}
            className="font-inter"
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || platformsToPost.length === 0}
            className="font-inter gap-2"
          >
            {submitting ? (
              <>
                <span className="animate-spin">
                  <Icon icon="lucide:loader-2" className="w-4 h-4" />
                </span>
                Saving...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Mark as Posted
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
