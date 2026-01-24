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
import { supabase } from "@/integrations/supabase/client";

interface ShareCampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  type: "campaign" | "boost";
  bannerUrl: string | null;
  brandColor?: string | null;
  brandSlug: string;
  slug: string;
  id: string;
  onSlugUpdate?: (newSlug: string) => void;
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
  id,
  onSlugUpdate,
}: ShareCampaignDialogProps) {
  const { toast } = useToast();
  const [linkCopied, setLinkCopied] = useState(false);
  const [embedCopied, setEmbedCopied] = useState(false);
  const [showEmbed, setShowEmbed] = useState(false);
  const [showPortalUrl, setShowPortalUrl] = useState(false);
  const [isEditingSlug, setIsEditingSlug] = useState(false);
  const [editedSlug, setEditedSlug] = useState(slug);
  const [isSavingSlug, setIsSavingSlug] = useState(false);
  const [currentSlug, setCurrentSlug] = useState(slug);

  const publicUrl = `${window.location.origin}/join/${currentSlug}`;

  // Portal URL for boosts - uses the /campaign/ route
  const portalUrl = `${window.location.origin}/campaign/${currentSlug}`;

  // Current displayed URL based on toggle state
  const displayedUrl = showPortalUrl ? portalUrl : publicUrl;

  const embedCode = getEmbedCode(brandSlug, currentSlug);

  const handleSaveSlug = async () => {
    if (!editedSlug.trim() || editedSlug === currentSlug) {
      setIsEditingSlug(false);
      return;
    }

    // Validate slug format
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(editedSlug)) {
      toast({
        title: "Invalid slug",
        description: "Slug can only contain lowercase letters, numbers, and hyphens",
        variant: "destructive",
      });
      return;
    }

    setIsSavingSlug(true);
    try {
      const table = type === "campaign" ? "campaigns" : "bounty_campaigns";

      // Check if slug is already taken
      const { data: existing } = await supabase
        .from(table)
        .select("id")
        .eq("slug", editedSlug)
        .neq("id", id)
        .maybeSingle();

      if (existing) {
        toast({
          title: "Slug already taken",
          description: "Please choose a different slug",
          variant: "destructive",
        });
        setIsSavingSlug(false);
        return;
      }

      const { error } = await supabase
        .from(table)
        .update({ slug: editedSlug })
        .eq("id", id);

      if (error) throw error;

      setCurrentSlug(editedSlug);
      setIsEditingSlug(false);
      onSlugUpdate?.(editedSlug);
      toast({
        title: "Slug updated",
        description: "Your campaign URL has been updated",
      });
    } catch (error) {
      console.error("Error updating slug:", error);
      toast({
        title: "Failed to update",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsSavingSlug(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(displayedUrl);
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

          {/* Public Link with Inline Slug Editing */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">
                Public link
              </label>
              <div className="flex items-center gap-3">
                {/* Swap to Portal - only for boosts */}
                {type === "boost" && !isEditingSlug && (
                  <button
                    onClick={() => setShowPortalUrl(!showPortalUrl)}
                    className="flex items-center gap-1 text-xs font-medium font-inter tracking-[-0.3px] text-foreground hover:text-foreground/80 transition-colors select-none"
                  >
                    <Icon icon="material-symbols:swap-horiz-rounded" className="w-3.5 h-3.5" />
                    <span>{showPortalUrl ? "Swap to Boost" : "Swap to Portal"}</span>
                  </button>
                )}
                {!isEditingSlug && (
                  <button
                    onClick={() => {
                      setEditedSlug(currentSlug);
                      setIsEditingSlug(true);
                    }}
                    className="flex items-center gap-1 text-xs font-medium font-inter tracking-[-0.3px] text-primary hover:text-primary/80 transition-colors select-none"
                  >
                    <Icon icon="material-symbols:edit-outline" className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                )}
              </div>
            </div>
            {isEditingSlug ? (
              <div className="flex gap-2">
                <div className="flex-1 flex items-center h-10 bg-muted/30 dark:bg-muted/20 border border-border/50 rounded-md overflow-hidden px-3">
                  <span className="text-sm text-muted-foreground font-inter tracking-[-0.3px] whitespace-nowrap">
                    virality.gg/join/
                  </span>
                  <input
                    type="text"
                    value={editedSlug}
                    onChange={(e) => setEditedSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    className="flex-1 h-full bg-transparent border-0 outline-none text-sm font-inter tracking-[-0.3px] text-foreground font-semibold"
                    placeholder="my-campaign"
                    spellCheck={false}
                    autoComplete="off"
                    autoFocus
                  />
                </div>
                <Button
                  onClick={handleSaveSlug}
                  disabled={isSavingSlug || !editedSlug.trim()}
                  className="h-10 w-10 p-0 bg-primary hover:bg-primary/90 text-primary-foreground shrink-0"
                >
                  {isSavingSlug ? (
                    <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Icon icon="material-symbols:check-rounded" className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  onClick={() => {
                    setIsEditingSlug(false);
                    setEditedSlug(currentSlug);
                  }}
                  variant="ghost"
                  className="h-10 w-10 p-0 shrink-0 hover:bg-muted text-muted-foreground hover:text-foreground"
                >
                  <Icon icon="material-symbols:close-rounded" className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  value={displayedUrl}
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
            )}
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
