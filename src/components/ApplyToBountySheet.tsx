import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ExternalLink, AlertCircle, Upload, X } from "lucide-react";
import { OptimizedImage } from "@/components/OptimizedImage";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { AddSocialAccountDialog } from "@/components/AddSocialAccountDialog";
import discordIcon from "@/assets/discord-icon.png";
import tiktokLogo from "@/assets/tiktok-logo-white.png";
import instagramLogo from "@/assets/instagram-logo-white.png";
import alternateEmailIcon from "@/assets/alternate-email-icon.svg";
import fullscreenIcon from "@/assets/fullscreen-icon.svg";
import fullscreenIconDark from "@/assets/fullscreen-icon-dark.svg";
import { useTheme } from "@/components/ThemeProvider";
interface BountyCampaign {
  id: string;
  title: string;
  description: string | null;
  monthly_retainer: number;
  videos_per_month: number;
  content_style_requirements: string;
  max_accepted_creators: number;
  accepted_creators_count: number;
  start_date: string | null;
  end_date: string | null;
  banner_url: string | null;
  status: string;
  blueprint_id?: string | null;
  slug?: string | null;
  brands?: {
    name: string;
    logo_url: string;
    is_verified?: boolean;
  };
}
interface ApplyToBountySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bounty: BountyCampaign | null;
  onSuccess: () => void;
}
export function ApplyToBountySheet({
  open,
  onOpenChange,
  bounty,
  onSuccess
}: ApplyToBountySheetProps) {
  const { resolvedTheme } = useTheme();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [uploadedVideoFile, setUploadedVideoFile] = useState<File | null>(null);
  const [uploadedVideoPreview, setUploadedVideoPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [applicationText, setApplicationText] = useState("");
  const [hasConnectedAccounts, setHasConnectedAccounts] = useState(false);
  const [isCheckingAccounts, setIsCheckingAccounts] = useState(true);
  const [socialAccounts, setSocialAccounts] = useState<any[]>([]);
  const [discordConnected, setDiscordConnected] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const [showAddSocialDialog, setShowAddSocialDialog] = useState(false);
  const [showDiscordDialog, setShowDiscordDialog] = useState(false);
  const [blueprint, setBlueprint] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check for connected accounts and fetch blueprint when sheet opens
  useEffect(() => {
    if (open) {
      checkConnectedAccounts();
      if (bounty?.blueprint_id) {
        fetchBlueprint(bounty.blueprint_id);
      } else {
        setBlueprint(null);
      }
    }
  }, [open, bounty?.blueprint_id]);
  const fetchBlueprint = async (blueprintId: string) => {
    const {
      data
    } = await supabase.from('blueprints').select('*').eq('id', blueprintId).single();
    setBlueprint(data);
  };
  const checkConnectedAccounts = async () => {
    setIsCheckingAccounts(true);
    try {
      const {
        data: {
          session
        }
      } = await supabase.auth.getSession();
      if (!session) return;
      setUserId(session.user.id);

      // Check for social accounts
      const {
        data: accounts
      } = await supabase.from('social_accounts').select('*').eq('user_id', session.user.id);
      setSocialAccounts(accounts || []);

      // Check for Discord connection
      const {
        data: profile
      } = await supabase.from('profiles').select('discord_id, discord_username').eq('id', session.user.id).single();
      setDiscordConnected(!!profile?.discord_id);

      // User needs at least one social account OR Discord
      const hasAccounts = accounts && accounts.length > 0 || !!profile?.discord_id;
      setHasConnectedAccounts(hasAccounts);
    } catch (error) {
      console.error("Error checking accounts:", error);
    } finally {
      setIsCheckingAccounts(false);
    }
  };
  if (!bounty) return null;
  const spotsRemaining = bounty.max_accepted_creators - bounty.accepted_creators_count;
  const isFull = spotsRemaining <= 0;
  const isPaused = bounty.status === 'paused';
  const handleVideoUpload = async (file: File) => {
    if (!file.type.startsWith('video/')) {
      toast.error("Please upload a video file");
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      toast.error("Video must be less than 100MB");
      return;
    }
    setUploadedVideoFile(file);
    setUploadedVideoPreview(URL.createObjectURL(file));
    setVideoUrl(""); // Clear URL input when file is uploaded
  };
  const removeUploadedVideo = () => {
    if (uploadedVideoPreview) {
      URL.revokeObjectURL(uploadedVideoPreview);
    }
    setUploadedVideoFile(null);
    setUploadedVideoPreview(null);
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoUrl.trim() && !uploadedVideoFile) {
      toast.error("Please provide a video URL or upload a video");
      return;
    }

    // Basic URL validation if URL is provided
    if (videoUrl.trim()) {
      try {
        new URL(videoUrl);
      } catch {
        toast.error("Please provide a valid URL");
        return;
      }
    }
    setSubmitting(true);
    try {
      const {
        data: {
          session
        }
      } = await supabase.auth.getSession();
      if (!session) {
        toast.error("You must be logged in to apply");
        return;
      }

      // Check if already applied
      const {
        data: existing
      } = await supabase.from('bounty_applications').select('id').eq('bounty_campaign_id', bounty.id).eq('user_id', session.user.id).maybeSingle();
      if (existing) {
        toast.error("You've already applied to this boost");
        setSubmitting(false);
        return;
      }
      let finalVideoUrl = videoUrl.trim();

      // Upload video if file is selected
      if (uploadedVideoFile) {
        setIsUploading(true);
        const fileExt = uploadedVideoFile.name.split('.').pop();
        const fileName = `${session.user.id}/${bounty.id}/${Date.now()}.${fileExt}`;
        const {
          data: uploadData,
          error: uploadError
        } = await supabase.storage.from('campaign-videos').upload(fileName, uploadedVideoFile);
        if (uploadError) throw uploadError;
        const {
          data: {
            publicUrl
          }
        } = supabase.storage.from('campaign-videos').getPublicUrl(fileName);
        finalVideoUrl = publicUrl;
        setIsUploading(false);
      }
      // Check if boost is full - if so, add to waitlist
      const applicationStatus = isFull ? 'waitlisted' : 'pending';

      const {
        error
      } = await supabase.from('bounty_applications').insert({
        bounty_campaign_id: bounty.id,
        user_id: session.user.id,
        video_url: finalVideoUrl,
        application_text: applicationText.trim() || null,
        status: applicationStatus
      });
      if (error) throw error;
      toast.success(isFull ? "You've been added to the waitlist!" : "Application submitted successfully!");
      onSuccess();
      onOpenChange(false);

      // Reset form
      setVideoUrl("");
      setApplicationText("");
      removeUploadedVideo();
    } catch (error: any) {
      console.error("Error submitting application:", error);
      toast.error(error.message || "Failed to submit application");
      setIsUploading(false);
    } finally {
      setSubmitting(false);
    }
  };
  return <>
      <AddSocialAccountDialog open={showAddSocialDialog} onOpenChange={setShowAddSocialDialog} onSuccess={checkConnectedAccounts} />

      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-xl bg-background border-0 p-0 overflow-visible flex flex-col">
          {/* Floating Fullscreen Button */}
          <button onClick={() => {
          onOpenChange(false);
          navigate(`/c/${bounty.slug || bounty.id}`);
        }} className="absolute -left-12 top-4 w-9 h-9 rounded-lg bg-card backdrop-blur-sm border border-border/50 flex items-center justify-center hover:bg-muted transition-colors z-50" title="Open full page">
            <img src={resolvedTheme === 'dark' ? fullscreenIcon : fullscreenIconDark} alt="Fullscreen" className="w-5 h-5" />
          </button>
          {/* Always show boost details */}
          <>
              {/* Banner Image */}
              {bounty.banner_url && <div className="relative w-full h-48 flex-shrink-0 overflow-hidden bg-muted">
            <OptimizedImage src={bounty.banner_url} alt={bounty.title} className="w-full h-full object-cover object-center" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
          </div>}

        <div className="p-6 space-y-6 flex-1 overflow-y-auto pb-24">
          {/* Header with Brand */}
          <SheetHeader className="space-y-4 text-left">
            <div className="flex items-start gap-3">
              {bounty.brands?.logo_url && <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                  <OptimizedImage src={bounty.brands.logo_url} alt={bounty.brands.name || ''} className="w-full h-full object-cover" />
                </div>}
              <div className="flex-1 -mt-0.5">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <p className="text-sm text-foreground font-medium">{bounty.brands?.name}</p>
                  {bounty.brands?.is_verified && <VerifiedBadge />}
                </div>
                <SheetTitle className="text-2xl font-bold text-foreground">
                  {bounty.title}
                </SheetTitle>
              </div>
            </div>
            
          </SheetHeader>

          {/* Stats Cards - Visual grid layout */}
          


          {/* Application Form */}
          <form onSubmit={handleSubmit} className="space-y-5 pt-2 py-0">
              {/* Connected Accounts Display */}
              {socialAccounts.length > 0 || discordConnected}

              {/* Video Upload Section */}
              <div className="space-y-3">
                <Label className="text-foreground font-medium font-['Inter'] tracking-[-0.5px]">
                  Example Video *
                </Label>
                <p className="text-xs text-muted-foreground font-['Inter'] tracking-[-0.5px]">
                  Show us your content style with a video link or upload
                </p>
                
                {/* Upload or URL Toggle Area */}
                {!uploadedVideoFile ? <div className="space-y-3">
                    {/* Upload Button */}
                    <input ref={fileInputRef} type="file" accept="video/*" onChange={e => e.target.files?.[0] && handleVideoUpload(e.target.files[0])} className="hidden" />
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full flex flex-col items-center justify-center gap-2 p-6 rounded-lg bg-muted/50 hover:bg-muted transition-colors group">
                      <Upload className="h-8 w-8 text-muted-foreground group-hover:text-foreground" />
                      <span className="text-sm text-muted-foreground group-hover:text-foreground font-['Inter'] tracking-[-0.5px]">
                        Click to upload video
                      </span>
                      <span className="text-xs text-muted-foreground/60 font-['Inter'] tracking-[-0.5px]">MP4, MOV up to 100MB</span>
                    </button>
                    
                    {/* Or divider */}
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-border" />
                      </div>
                      <div className="relative flex justify-center text-xs">
                        <span className="bg-background px-2 text-muted-foreground font-['Inter'] tracking-[-0.5px]">or paste URL</span>
                      </div>
                    </div>
                    
                    {/* URL Input */}
                    <div className="relative">
                      <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input type="url" value={videoUrl} onChange={e => setVideoUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..." className="pl-10 bg-muted/50 border-0 text-foreground placeholder:text-muted-foreground font-['Inter'] tracking-[-0.5px]" />
                    </div>
                  </div> : (/* Video Preview */
                <div className="relative rounded-lg overflow-hidden bg-muted/50">
                    <video src={uploadedVideoPreview || ''} className="w-full max-h-48 object-contain" controls />
                    <button type="button" onClick={removeUploadedVideo} className="absolute top-2 right-2 p-1.5 rounded-full bg-background/80 hover:bg-background text-foreground transition-colors">
                      <X className="h-4 w-4" />
                    </button>
                  </div>)}
              </div>

              <div>
                <Label htmlFor="application_text" className="text-foreground mb-2 block font-['Inter'] tracking-[-0.5px]">
                  Why are you a good fit? (Optional)
                </Label>
                <Textarea id="application_text" value={applicationText} onChange={e => setApplicationText(e.target.value)} placeholder="Tell the brand why you'd be perfect for this boost..." className="bg-muted/50 border-0 text-foreground placeholder:text-muted-foreground min-h-[100px] resize-none font-['Inter'] tracking-[-0.5px]" />
              </div>

              <div className="flex gap-3 fixed bottom-0 left-0 right-0 bg-background py-4 px-6 border-t border-border sm:left-auto sm:right-0 sm:w-full sm:max-w-xl">
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="flex-1 font-['Inter'] tracking-[-0.5px]" disabled={submitting || isUploading}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting || isPaused || isUploading || !videoUrl.trim() && !uploadedVideoFile} className="flex-1 font-['Inter'] tracking-[-0.5px]">
                  {isUploading ? "Uploading..." : submitting ? "Submitting..." : isPaused ? "Boost Paused" : isFull ? "Join Waitlist" : "Submit Application"}
                </Button>
              </div>
            </form>
              </div>
            </>
        </SheetContent>
      </Sheet>
    </>;
}