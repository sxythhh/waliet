import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Icon } from "@iconify/react";
import { useToast } from "@/hooks/use-toast";
import { OptimizedImage } from "@/components/OptimizedImage";
import { getEmbedCode } from "@/utils/subdomain";

interface ShareCampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  type: "campaign" | "boost";
  bannerUrl: string | null;
  brandColor?: string | null;
  brandSlug: string;
  slug: string;
}

export function ShareCampaignDialog({
  open,
  onOpenChange,
  title,
  type,
  bannerUrl,
  brandColor,
  brandSlug,
  slug,
}: ShareCampaignDialogProps) {
  const { toast } = useToast();
  const [linkCopied, setLinkCopied] = useState(false);
  const [embedCopied, setEmbedCopied] = useState(false);
  const [showEmbed, setShowEmbed] = useState(false);

  const publicUrl = type === "campaign"
    ? `${window.location.origin}/c/${slug}`
    : `${window.location.origin}/boost/${slug}`;

  const embedCode = getEmbedCode(brandSlug, slug);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setLinkCopied(true);
      toast({
        title: "Link copied",
        description: "URL copied to clipboard",
      });
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      toast({
        title: "Failed to copy",
        description: "Please copy the link manually",
        variant: "destructive",
      });
    }
  };

  const handleCopyEmbed = async () => {
    try {
      await navigator.clipboard.writeText(embedCode);
      setEmbedCopied(true);
      toast({
        title: "Embed code copied",
        description: "Code copied to clipboard",
      });
      setTimeout(() => setEmbedCopied(false), 2000);
    } catch {
      toast({
        title: "Failed to copy",
        description: "Please copy the code manually",
        variant: "destructive",
      });
    }
  };

  const shareToTwitter = () => {
    const text = `Check out this ${type === "campaign" ? "clipping campaign" : "boost"}: ${title}`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(publicUrl)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const shareToFacebook = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(publicUrl)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const shareToLinkedIn = () => {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(publicUrl)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card dark:bg-[#080808] border-border dark:border-[#1a1a1a]">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold font-inter tracking-[-0.5px]">
            Share {type === "campaign" ? "Campaign" : "Boost"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Campaign Preview */}
          <div className="rounded-xl overflow-hidden border border-border/50">
            <div className="relative h-32 bg-muted">
              {bannerUrl ? (
                <OptimizedImage
                  src={bannerUrl}
                  alt={title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center"
                  style={{ backgroundColor: brandColor || "#6366f1" }}
                >
                  <img
                    alt=""
                    src="/lovable-uploads/090bbb71-fff3-4820-a16e-521aac57990e.png"
                    className="w-10 h-10 opacity-100"
                  />
                </div>
              )}
            </div>
            <div className="p-3 bg-muted/30 dark:bg-muted/20">
              <h4 className="text-sm font-semibold font-inter tracking-[-0.5px] truncate">
                {title}
              </h4>
              <p className="text-xs text-muted-foreground font-inter tracking-[-0.3px] mt-0.5">
                {type === "campaign" ? "Clipping Campaign" : "Boost"}
              </p>
            </div>
          </div>

          {/* Copy Link */}
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">
              Public link
            </label>
            <div className="flex gap-2">
              <Input
                value={publicUrl}
                readOnly
                className="h-10 !bg-muted/30 dark:!bg-muted/20 border border-border/50 text-sm font-inter tracking-[-0.3px] cursor-text"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <Button
                onClick={handleCopyLink}
                className="h-10 px-4 bg-primary hover:bg-primary/90 text-primary-foreground shrink-0"
              >
                {linkCopied ? (
                  <Icon icon="material-symbols:check-rounded" className="w-4 h-4" />
                ) : (
                  <Icon icon="material-symbols:content-copy-outline-rounded" className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Social Share Buttons */}
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">
              Share on social
            </label>
            <div className="flex gap-2">
              <button
                onClick={shareToTwitter}
                className="flex-1 h-10 rounded-lg bg-muted/30 dark:bg-muted/20 hover:bg-muted/50 dark:hover:bg-muted/40 border border-border/50 flex items-center justify-center gap-2 text-sm font-medium font-inter tracking-[-0.3px] transition-colors"
              >
                <Icon icon="ri:twitter-x-fill" className="w-4 h-4" />
                <span className="hidden sm:inline">X</span>
              </button>
              <button
                onClick={shareToFacebook}
                className="flex-1 h-10 rounded-lg bg-muted/30 dark:bg-muted/20 hover:bg-muted/50 dark:hover:bg-muted/40 border border-border/50 flex items-center justify-center gap-2 text-sm font-medium font-inter tracking-[-0.3px] transition-colors"
              >
                <Icon icon="ri:facebook-fill" className="w-4 h-4" />
                <span className="hidden sm:inline">Facebook</span>
              </button>
              <button
                onClick={shareToLinkedIn}
                className="flex-1 h-10 rounded-lg bg-muted/30 dark:bg-muted/20 hover:bg-muted/50 dark:hover:bg-muted/40 border border-border/50 flex items-center justify-center gap-2 text-sm font-medium font-inter tracking-[-0.3px] transition-colors"
              >
                <Icon icon="ri:linkedin-fill" className="w-4 h-4" />
                <span className="hidden sm:inline">LinkedIn</span>
              </button>
            </div>
          </div>

          {/* Embed Code - Collapsible */}
          <div className="space-y-2">
            <button
              onClick={() => setShowEmbed(!showEmbed)}
              className="flex items-center gap-2 text-xs text-muted-foreground font-inter tracking-[-0.3px] hover:text-foreground transition-colors"
            >
              <Icon
                icon="material-symbols:chevron-right-rounded"
                className={`w-4 h-4 transition-transform ${showEmbed ? "rotate-90" : ""}`}
              />
              Embed on your website
            </button>

            {showEmbed && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="relative">
                  <div className="p-3 bg-muted/30 dark:bg-muted/20 rounded-lg border border-border/50 overflow-hidden">
                    <pre className="text-xs font-inter text-foreground whitespace-pre-wrap break-all">
                      {embedCode}
                    </pre>
                  </div>
                  <button
                    type="button"
                    className="absolute top-2 right-2 h-7 px-2.5 gap-1.5 flex items-center rounded-md bg-background dark:bg-[#1a1a1a] hover:bg-muted dark:hover:bg-[#252525] text-foreground border border-border/50 transition-colors"
                    onClick={handleCopyEmbed}
                  >
                    <Icon
                      icon={embedCopied ? "material-symbols:check-rounded" : "material-symbols:content-copy-outline-rounded"}
                      className="w-3.5 h-3.5"
                    />
                    <span className="text-xs font-inter">{embedCopied ? "Copied" : "Copy"}</span>
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground font-inter tracking-[-0.3px]">
                  Paste this code into your website to embed the campaign portal.
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
