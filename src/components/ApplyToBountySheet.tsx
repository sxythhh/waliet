import { useState, useEffect, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ExternalLink, AlertCircle, CheckCircle2, Upload, X, Play } from "lucide-react";
import { OptimizedImage } from "@/components/OptimizedImage";
import { AddSocialAccountDialog } from "@/components/AddSocialAccountDialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import discordIcon from "@/assets/discord-icon.png";
import tiktokLogo from "@/assets/tiktok-logo-white.png";
import instagramLogo from "@/assets/instagram-logo-white.png";

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
  brands?: {
    name: string;
    logo_url: string;
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check for connected accounts when sheet opens
  useEffect(() => {
    if (open) {
      checkConnectedAccounts();
    }
  }, [open]);

  const checkConnectedAccounts = async () => {
    setIsCheckingAccounts(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      setUserId(session.user.id);

      // Check for social accounts
      const { data: accounts } = await supabase
        .from('social_accounts')
        .select('*')
        .eq('user_id', session.user.id);

      setSocialAccounts(accounts || []);

      // Check for Discord connection
      const { data: profile } = await supabase
        .from('profiles')
        .select('discord_id, discord_username')
        .eq('id', session.user.id)
        .single();

      setDiscordConnected(!!profile?.discord_id);

      // User needs at least one social account OR Discord
      const hasAccounts = (accounts && accounts.length > 0) || !!profile?.discord_id;
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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("You must be logged in to apply");
        return;
      }

      // Check if already applied
      const { data: existing } = await supabase
        .from('bounty_applications')
        .select('id')
        .eq('bounty_campaign_id', bounty.id)
        .eq('user_id', session.user.id)
        .maybeSingle();

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
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('campaign-videos')
          .upload(fileName, uploadedVideoFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('campaign-videos')
          .getPublicUrl(fileName);

        finalVideoUrl = publicUrl;
        setIsUploading(false);
      }

      const { error } = await supabase
        .from('bounty_applications')
        .insert({
          bounty_campaign_id: bounty.id,
          user_id: session.user.id,
          video_url: finalVideoUrl,
          application_text: applicationText.trim() || null
        });

      if (error) throw error;

      toast.success("Application submitted successfully!");
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

  return (
    <>
      <AddSocialAccountDialog
        open={showAddSocialDialog}
        onOpenChange={setShowAddSocialDialog}
        onSuccess={checkConnectedAccounts}
      />

      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent 
          side="right" 
          className="w-full sm:max-w-xl bg-[#0a0a0a] border-0 p-0 overflow-y-auto"
        >
          {/* Account Connection Required Screen */}
          {!isCheckingAccounts && !hasConnectedAccounts ? (
            <div className="p-6 space-y-6">
              <SheetHeader>
                <SheetTitle className="text-2xl">Connect Your Account</SheetTitle>
                <SheetDescription>
                  To apply for this boost, you must connect at least one social media account OR Discord.
                </SheetDescription>
              </SheetHeader>

              <Alert className="bg-yellow-500/10 border-yellow-500/20">
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                <AlertDescription className="text-yellow-500/90">
                  This helps us verify your identity and track your content performance.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium mb-3 text-muted-foreground">Connect Social Media</h3>
                  <div className="space-y-2">
                    <Button
                      onClick={() => setShowAddSocialDialog(true)}
                      className="w-full justify-start gap-3 h-12"
                      variant="outline"
                    >
                      <div className="flex gap-2">
                        <img src={tiktokLogo} alt="TikTok" className="w-5 h-5" />
                        <img src={instagramLogo} alt="Instagram" className="w-5 h-5" />
                      </div>
                      <span>Connect TikTok, Instagram, YouTube or X</span>
                    </Button>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-white/10" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-[#0a0a0a] px-2 text-muted-foreground">Or</span>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-3 text-muted-foreground">Connect Discord</h3>
                  <Button
                    onClick={() => {
                      const DISCORD_CLIENT_ID = '1358316231341375518';
                      const REDIRECT_URI = `${window.location.origin}/discord/callback`;
                      const STATE = btoa(JSON.stringify({ userId }));
                      
                      const discordAuthUrl = `https://discord.com/api/oauth2/authorize?` +
                        `client_id=${DISCORD_CLIENT_ID}&` +
                        `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
                        `response_type=code&` +
                        `scope=identify%20email%20guilds.join&` +
                        `state=${STATE}`;

                      const popup = window.open(
                        discordAuthUrl,
                        'Discord OAuth',
                        'width=500,height=700'
                      );

                      const handleMessage = async (event: MessageEvent) => {
                        if (event.origin !== window.location.origin) return;
                        
                        if (event.data.type === 'discord-oauth-success') {
                          popup?.close();
                          toast.success("Discord account linked successfully!");
                          checkConnectedAccounts();
                        } else if (event.data.type === 'discord-oauth-error') {
                          popup?.close();
                          toast.error(event.data.error || "Failed to link Discord account.");
                        }
                      };

                      window.addEventListener('message', handleMessage);
                    }}
                    className="w-full justify-start gap-3 h-12 bg-[#5765F2] hover:bg-[#5765F2]/90 text-white"
                  >
                    <img src={discordIcon} alt="Discord" className="w-5 h-5" />
                    <span>Connect Discord</span>
                  </Button>
                </div>

                {/* Show connected accounts status */}
                {(socialAccounts.length > 0 || discordConnected) && (
                  <div className="pt-4 border-t border-white/10 space-y-2">
                    <h3 className="text-sm font-medium text-muted-foreground">Connected Accounts</h3>
                    {socialAccounts.map((account) => (
                      <div key={account.id} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span className="capitalize">{account.platform}</span>
                        <span className="text-muted-foreground">@{account.username}</span>
                      </div>
                    ))}
                    {discordConnected && (
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span>Discord Connected</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <Button
                onClick={checkConnectedAccounts}
                className="w-full"
                size="lg"
              >
                Continue to Application
              </Button>
            </div>
          ) : (
            <>
              {/* Banner Image */}
              {bounty.banner_url && (
          <div className="relative w-full h-48 flex-shrink-0 overflow-hidden bg-muted">
            <OptimizedImage
              src={bounty.banner_url}
              alt={bounty.title}
              className="w-full h-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent" />
          </div>
        )}

        <div className="p-6 space-y-6">
          {/* Header with Brand */}
          <SheetHeader className="space-y-4 text-left">
            <div className="flex items-start gap-3">
              {bounty.brands?.logo_url && (
                <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 ring-1 ring-white/10">
                  <OptimizedImage 
                    src={bounty.brands.logo_url} 
                    alt={bounty.brands.name || ''} 
                    className="w-full h-full object-cover" 
                  />
                </div>
              )}
              <div className="flex-1">
                <SheetTitle className="text-2xl font-bold text-white mb-1">
                  {bounty.title}
                </SheetTitle>
                <p className="text-sm text-white/60">{bounty.brands?.name}</p>
              </div>
            </div>
            
            {bounty.description && (
              <SheetDescription className="text-white/70 text-sm leading-relaxed">
                {bounty.description}
              </SheetDescription>
            )}
          </SheetHeader>

          {/* Stats Row - Clean horizontal layout */}
          <div className="flex items-center gap-6 py-4">
            <div className="flex-1">
              <p className="text-2xl font-bold text-white font-['Inter'] tracking-[-0.5px]">
                ${bounty.monthly_retainer.toLocaleString()}
              </p>
              <p className="text-xs text-white/50 font-medium">per month</p>
            </div>
            
            <div className="flex-1">
              <p className="text-2xl font-bold text-white font-['Inter'] tracking-[-0.5px]">
                {bounty.videos_per_month}
              </p>
              <p className="text-xs text-white/50 font-medium">videos/month</p>
            </div>
            
            <div className="flex-1">
              <p className={`text-2xl font-bold font-['Inter'] tracking-[-0.5px] ${isFull ? 'text-white/40' : 'text-white'}`}>
                {spotsRemaining > 0 ? spotsRemaining : 0}
              </p>
              <p className="text-xs text-white/50 font-medium">
                {isFull ? 'fully booked' : 'spots left'}
              </p>
            </div>
          </div>

          {/* Content Requirements - Redesigned */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-white mb-1 font-['Inter'] tracking-[-0.5px]">
                What We're Looking For
              </h3>
              <p className="text-xs text-white/40">Content guidelines and requirements</p>
            </div>
            
            <div className="space-y-3">
              {bounty.content_style_requirements.split('\n').filter(line => line.trim()).map((requirement, index) => (
                <div key={index} className="flex gap-3 items-start">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                  <p className="text-sm text-white/80 leading-relaxed">
                    {requirement.trim()}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Application Form */}
          <form onSubmit={handleSubmit} className="space-y-5 pt-2">
            {/* Video Upload Section */}
            <div className="space-y-3">
              <Label className="text-white font-medium">
                Example Video *
              </Label>
              <p className="text-xs text-white/50">
                Show us your content style with a video link or upload
              </p>
              
              {/* Upload or URL Toggle Area */}
              {!uploadedVideoFile ? (
                <div className="space-y-3">
                  {/* Upload Button */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/*"
                    onChange={(e) => e.target.files?.[0] && handleVideoUpload(e.target.files[0])}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex flex-col items-center justify-center gap-2 p-6 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group"
                  >
                    <Upload className="h-8 w-8 text-white/40 group-hover:text-white/60" />
                    <span className="text-sm text-white/60 group-hover:text-white/80">
                      Click to upload video
                    </span>
                    <span className="text-xs text-white/30">MP4, MOV up to 100MB</span>
                  </button>
                  
                  {/* Or divider */}
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-white/10" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-[#0a0a0a] px-2 text-white/30">or paste URL</span>
                    </div>
                  </div>
                  
                  {/* URL Input */}
                  <div className="relative">
                    <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                    <Input
                      type="url"
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      placeholder="https://youtube.com/watch?v=..."
                      className="pl-10 bg-white/5 border-transparent text-white placeholder:text-white/30"
                    />
                  </div>
                </div>
              ) : (
                /* Video Preview */
                <div className="relative rounded-lg overflow-hidden bg-black/20">
                  <video
                    src={uploadedVideoPreview || ''}
                    className="w-full max-h-48 object-contain"
                    controls
                  />
                  <button
                    type="button"
                    onClick={removeUploadedVideo}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="application_text" className="text-white mb-2 block">
                Why are you a good fit? (Optional)
              </Label>
              <Textarea
                id="application_text"
                value={applicationText}
                onChange={(e) => setApplicationText(e.target.value)}
                placeholder="Tell the brand why you'd be perfect for this boost..."
                className="bg-white/5 border-transparent text-white placeholder:text-white/30 min-h-[100px] resize-none"
              />
            </div>

            <div className="flex gap-3 pt-4 sticky bottom-0 bg-[#0a0a0a] py-4 -mx-6 px-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1 bg-transparent border-transparent text-white hover:bg-white/5"
                disabled={submitting || isUploading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting || isFull || isUploading || (!videoUrl.trim() && !uploadedVideoFile)}
                className="flex-1 bg-primary hover:bg-primary/90 disabled:opacity-50"
              >
                {isUploading ? "Uploading..." : submitting ? "Submitting..." : isFull ? "No Spots Available" : "Submit Application"}
              </Button>
            </div>
          </form>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
