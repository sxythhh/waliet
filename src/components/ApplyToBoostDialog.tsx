import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertCircle, Upload, X, Play, Link2 } from "lucide-react";
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

interface ApplyToBoostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bounty: BountyCampaign | null;
  onSuccess: () => void;
}

export function ApplyToBoostDialog({ 
  open, 
  onOpenChange, 
  bounty,
  onSuccess 
}: ApplyToBoostDialogProps) {
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
  const fileInputRef = useRef<HTMLInputElement>(null);

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

      const { data: accounts } = await supabase
        .from('social_accounts')
        .select('*')
        .eq('user_id', session.user.id);

      setSocialAccounts(accounts || []);

      const { data: profile } = await supabase
        .from('profiles')
        .select('discord_id, discord_username')
        .eq('id', session.user.id)
        .single();

      setDiscordConnected(!!profile?.discord_id);

      const hasAccounts = (accounts && accounts.length > 0) || !!profile?.discord_id;
      setHasConnectedAccounts(hasAccounts);
    } catch (error) {
      console.error("Error checking accounts:", error);
    } finally {
      setIsCheckingAccounts(false);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      toast.error("Please select a video file");
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      toast.error("Video file must be less than 100MB");
      return;
    }

    setUploadedVideoFile(file);
    const previewUrl = URL.createObjectURL(file);
    setUploadedVideoPreview(previewUrl);
    setVideoUrl("");
  };

  const removeUploadedVideo = () => {
    if (uploadedVideoPreview) {
      URL.revokeObjectURL(uploadedVideoPreview);
    }
    setUploadedVideoFile(null);
    setUploadedVideoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadVideoToStorage = async (file: File, bountyId: string): Promise<string | null> => {
    setIsUploading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const fileExt = file.name.split('.').pop();
      const fileName = `${session.user.id}/${bountyId}/${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('boost-applications')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error("Upload error:", error);
        
        if (error.message?.includes('Bucket not found')) {
          toast.error("Storage not configured. Please use a video URL instead.");
          return null;
        }
        throw error;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('boost-applications')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error("Error uploading video:", error);
      toast.error("Failed to upload video. Please try using a URL instead.");
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!bounty) return;
    
    if (!videoUrl.trim() && !uploadedVideoFile) {
      toast.error("Please provide a video URL or upload a video");
      return;
    }

    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in to apply");
        return;
      }

      const { data: existingApplication } = await supabase
        .from('bounty_applications')
        .select('id')
        .eq('bounty_campaign_id', bounty.id)
        .eq('user_id', session.user.id)
        .single();

      if (existingApplication) {
        toast.error("You have already applied to this bounty");
        return;
      }

      let finalVideoUrl = videoUrl.trim();

      if (uploadedVideoFile && !finalVideoUrl) {
        const uploadedUrl = await uploadVideoToStorage(uploadedVideoFile, bounty.id);
        if (uploadedUrl) {
          finalVideoUrl = uploadedUrl;
        } else {
          setSubmitting(false);
          return;
        }
      }

      const { error } = await supabase
        .from('bounty_applications')
        .insert({
          bounty_campaign_id: bounty.id,
          user_id: session.user.id,
          video_url: finalVideoUrl,
          application_text: applicationText || null,
          status: 'pending'
        });

      if (error) throw error;

      toast.success("Application submitted successfully!");
      setVideoUrl("");
      setApplicationText("");
      removeUploadedVideo();
      onSuccess();
    } catch (error) {
      console.error("Error submitting application:", error);
      toast.error("Failed to submit application");
    } finally {
      setSubmitting(false);
    }
  };

  if (!bounty) return null;

  const spotsRemaining = bounty.max_accepted_creators - bounty.accepted_creators_count;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px] bg-background">
          <DialogHeader>
            <div className="flex items-center gap-3">
              {bounty.brands?.logo_url && (
                <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 ring-1 ring-border/50">
                  <OptimizedImage src={bounty.brands.logo_url} alt={bounty.brands.name || ''} className="w-full h-full object-cover" />
                </div>
              )}
              <div>
                <DialogTitle className="font-['Inter'] tracking-[-0.5px] text-lg">Apply to {bounty.title}</DialogTitle>
                <DialogDescription className="font-['Inter'] tracking-[-0.5px]">
                  {bounty.brands?.name} • {spotsRemaining} spots remaining
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {isCheckingAccounts ? (
            <div className="py-8 text-center text-muted-foreground">
              Checking account requirements...
            </div>
          ) : !hasConnectedAccounts ? (
            <div className="space-y-4 py-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  You need to connect at least one social account or Discord before applying.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-2">
                <Button 
                  onClick={() => setShowAddSocialDialog(true)} 
                  className="w-full"
                  variant="outline"
                >
                  Connect Social Account
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              {/* Video Input */}
              <div className="space-y-2">
                <Label className="font-['Inter'] tracking-[-0.5px]">Sample Video</Label>
                <p className="text-xs text-muted-foreground">Provide a link to a video that showcases your content style</p>
                
                {uploadedVideoPreview ? (
                  <div className="relative rounded-lg overflow-hidden bg-muted">
                    <video 
                      src={uploadedVideoPreview} 
                      className="w-full h-32 object-cover"
                      controls
                    />
                    <button
                      onClick={removeUploadedVideo}
                      className="absolute top-2 right-2 p-1 bg-black/50 rounded-full hover:bg-black/70"
                    >
                      <X className="h-4 w-4 text-white" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="relative">
                      <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Paste video URL (TikTok, Instagram, YouTube)"
                        value={videoUrl}
                        onChange={(e) => setVideoUrl(e.target.value)}
                        className="pl-10 font-['Inter'] tracking-[-0.5px]"
                      />
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className="h-px flex-1 bg-border" />
                      <span className="text-xs text-muted-foreground">or</span>
                      <div className="h-px flex-1 bg-border" />
                    </div>
                    
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="video/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full font-['Inter'] tracking-[-0.5px]"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Video
                    </Button>
                  </div>
                )}
              </div>

              {/* Application Text */}
              <div className="space-y-2">
                <Label className="font-['Inter'] tracking-[-0.5px]">Why should we pick you? (optional)</Label>
                <Textarea
                  placeholder="Tell us about yourself and why you'd be a great fit..."
                  value={applicationText}
                  onChange={(e) => setApplicationText(e.target.value)}
                  rows={3}
                  className="font-['Inter'] tracking-[-0.5px]"
                />
              </div>

              {/* Connected Accounts Display */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground font-['Inter'] tracking-[-0.5px]">Your connected accounts</Label>
                <div className="flex flex-wrap gap-2">
                  {socialAccounts.map((account) => (
                    <div 
                      key={account.id} 
                      className="flex items-center gap-1.5 px-2 py-1 bg-muted rounded-md text-xs"
                    >
                      {account.platform === 'tiktok' && <img src={tiktokLogo} alt="" className="h-3 w-3" />}
                      {account.platform === 'instagram' && <img src={instagramLogo} alt="" className="h-3 w-3" />}
                      <span>@{account.username}</span>
                    </div>
                  ))}
                  {discordConnected && (
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-muted rounded-md text-xs">
                      <img src={discordIcon} alt="" className="h-3 w-3" />
                      <span>Discord</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {hasConnectedAccounts && !isCheckingAccounts && (
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => onOpenChange(false)} 
                className="flex-1 font-['Inter'] tracking-[-0.5px]"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={submitting || isUploading || (!videoUrl.trim() && !uploadedVideoFile)}
                className="flex-1 bg-[#2060de] hover:bg-[#2060de]/90 text-white font-['Inter'] tracking-[-0.5px]"
                style={{ borderTop: '1px solid #4b85f7' }}
              >
                {isUploading ? "Uploading..." : submitting ? "Submitting..." : "Submit Application"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AddSocialAccountDialog 
        open={showAddSocialDialog} 
        onOpenChange={setShowAddSocialDialog}
        onSuccess={() => {
          setShowAddSocialDialog(false);
          checkConnectedAccounts();
        }}
      />
    </>
  );
}
