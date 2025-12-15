import { useState, useEffect, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ExternalLink, AlertCircle, Upload, X } from "lucide-react";
import { OptimizedImage } from "@/components/OptimizedImage";
import { AddSocialAccountDialog } from "@/components/AddSocialAccountDialog";
import discordIcon from "@/assets/discord-icon.png";
import tiktokLogo from "@/assets/tiktok-logo-white.png";
import instagramLogo from "@/assets/instagram-logo-white.png";
import alternateEmailIcon from "@/assets/alternate-email-icon.svg";
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
      const {
        error
      } = await supabase.from('bounty_applications').insert({
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
  return <>
      <AddSocialAccountDialog open={showAddSocialDialog} onOpenChange={setShowAddSocialDialog} onSuccess={checkConnectedAccounts} />

      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-xl bg-background border-0 p-0 overflow-y-auto">
          {/* Always show boost details */}
          <>
              {/* Banner Image */}
              {bounty.banner_url && <div className="relative w-full h-48 flex-shrink-0 overflow-hidden bg-muted">
            <OptimizedImage src={bounty.banner_url} alt={bounty.title} className="w-full h-full object-cover object-center" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent" />
          </div>}

        <div className="p-6 space-y-6">
          {/* Header with Brand */}
          <SheetHeader className="space-y-4 text-left">
            <div className="flex items-start gap-3">
              {bounty.brands?.logo_url && <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 ring-1 ring-white/10">
                  <OptimizedImage src={bounty.brands.logo_url} alt={bounty.brands.name || ''} className="w-full h-full object-cover" />
                </div>}
              <div className="flex-1">
                <SheetTitle className="text-2xl font-bold text-white mb-1">
                  {bounty.title}
                </SheetTitle>
                <p className="text-sm text-white/60">{bounty.brands?.name}</p>
              </div>
            </div>
            
          </SheetHeader>

          {/* Stats Cards - Visual grid layout */}
          <div className="grid grid-cols-3 gap-3">
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/5 p-4 ring-1 ring-emerald-500/20">
              <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
              <p className="text-xl font-bold text-emerald-400 font-inter tracking-[-0.5px]">
                ${bounty.monthly_retainer.toLocaleString()}
              </p>
              <p className="text-[10px] text-white/50 font-medium uppercase tracking-wider mt-1">Per Month</p>
            </div>
            
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/5 p-4 ring-1 ring-blue-500/20">
              <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
              <p className="text-xl font-bold text-blue-400 font-inter tracking-[-0.5px]">
                {bounty.videos_per_month}
              </p>
              <p className="text-[10px] text-white/50 font-medium uppercase tracking-wider mt-1">Videos/Mo</p>
            </div>
            
            <div className={`relative overflow-hidden rounded-xl p-4 ring-1 ${isFull ? 'bg-white/5 ring-white/10' : 'bg-gradient-to-br from-amber-500/20 to-amber-600/5 ring-amber-500/20'}`}>
              <div className={`absolute top-0 right-0 w-16 h-16 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 ${isFull ? 'bg-white/5' : 'bg-amber-500/10'}`} />
              <p className={`text-xl font-bold font-inter tracking-[-0.5px] ${isFull ? 'text-white/40' : 'text-amber-400'}`}>
                {spotsRemaining > 0 ? spotsRemaining : 0}
              </p>
              <p className="text-[10px] text-white/50 font-medium uppercase tracking-wider mt-1">
                {isFull ? 'Full' : 'Spots Left'}
              </p>
            </div>
          </div>

          {/* Blueprint Details Section */}
          {blueprint && <div className="space-y-3">
              <div className="rounded-xl bg-white/[0.03] ring-1 ring-white/10 overflow-hidden">
                {/* Blueprint Header */}
                <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                  <span className="text-xs font-medium text-white/40 uppercase tracking-wider">Content Brief</span>
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs font-inter tracking-[-0.5px] text-white/60 hover:text-white hover:bg-white/10" onClick={() => window.open(`/blueprint/${blueprint.id}`, '_blank')}>
                    <ExternalLink className="h-3 w-3 mr-1" />
                    View Full
                  </Button>
                </div>
                
                <div className="p-4 space-y-4">
                  {/* Content Preview */}
                  {blueprint.content && <div className="text-sm text-white/70 leading-relaxed line-clamp-3 prose prose-invert prose-sm max-w-none [&>*]:m-0" dangerouslySetInnerHTML={{
                    __html: blueprint.content
                  }} />}
                  
                  {/* Hooks */}
                  {blueprint.hooks && Array.isArray(blueprint.hooks) && blueprint.hooks.length > 0 && <div className="space-y-2">
                      <span className="text-[10px] font-medium text-white/40 uppercase tracking-wider">Suggested Hooks</span>
                      <div className="space-y-1.5">
                        {blueprint.hooks.slice(0, 2).map((hook: any, idx: number) => <div key={idx} className="flex items-start gap-2 text-sm text-white/70 bg-white/[0.03] rounded-lg px-3 py-2">
                            <span className="text-amber-400 mt-0.5 text-xs">→</span>
                            <span className="line-clamp-1">{typeof hook === 'string' ? hook : hook.text}</span>
                          </div>)}
                      </div>
                    </div>}
                  
                  {/* Call to Action */}
                  {blueprint.call_to_action && <div className="space-y-1.5">
                      <span className="text-[10px] font-medium text-white/40 uppercase tracking-wider">Call to Action</span>
                      <p className="text-sm text-white/70 bg-emerald-500/10 rounded-lg px-3 py-2 ring-1 ring-emerald-500/20">{blueprint.call_to_action}</p>
                    </div>}
                  
                  {/* Hashtags */}
                  {blueprint.hashtags && Array.isArray(blueprint.hashtags) && blueprint.hashtags.length > 0 && <div className="flex flex-wrap gap-1.5">
                      {blueprint.hashtags.slice(0, 5).map((tag: string, idx: number) => <span key={idx} className="text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">
                          #{tag}
                        </span>)}
                    </div>}
                </div>
              </div>
            </div>}

          {/* Application Form - Show connect prompt if no accounts */}
          {!isCheckingAccounts && !hasConnectedAccounts ? <div className="space-y-5 pt-2">
              <div className="flex flex-col items-center justify-center py-8 px-4 text-center space-y-5 bg-white/[0.02] rounded-xl">
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                  <img src={alternateEmailIcon} alt="" className="h-6 w-6 opacity-60" />
                </div>
                
                <div className="space-y-2">
                  <h3 className="font-['Inter'] tracking-[-0.5px] text-base font-medium text-white">
                    Connect an account to apply
                  </h3>
                  <p className="font-['Inter'] tracking-[-0.5px] text-sm text-white/50 max-w-[280px]">
                    Link a social account or Discord to submit your application
                  </p>
                </div>
                
                <div className="flex flex-col gap-2 w-full max-w-[280px]">
                  <Button onClick={() => setShowAddSocialDialog(true)} className="font-['Inter'] tracking-[-0.5px] bg-[#2060de] hover:bg-[#2060de]/90 text-white w-full" style={{
                    borderTop: '1px solid #4b85f7'
                  }}>
                    Connect Social Account
                  </Button>
                  <Button onClick={() => {
                    const DISCORD_CLIENT_ID = '1358316231341375518';
                    const REDIRECT_URI = `${window.location.origin}/discord/callback`;
                    const STATE = btoa(JSON.stringify({
                      userId
                    }));
                    const discordAuthUrl = `https://discord.com/api/oauth2/authorize?` + `client_id=${DISCORD_CLIENT_ID}&` + `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` + `response_type=code&` + `scope=identify%20email%20guilds.join&` + `state=${STATE}`;
                    const popup = window.open(discordAuthUrl, 'Discord OAuth', 'width=500,height=700');
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
                  }} variant="ghost" className="font-['Inter'] tracking-[-0.5px] text-white/60 hover:text-white hover:bg-white/5 w-full gap-2 opacity-100">
                    <img alt="Discord" className="w-4 h-4" src="/lovable-uploads/db3f044f-3d8c-43ea-9461-09bfff9b41e0.webp" />
                    Connect Discord
                  </Button>
                </div>
              </div>
            </div> : <form onSubmit={handleSubmit} className="space-y-5 pt-2">
              {/* Connected Accounts Display */}
              {(socialAccounts.length > 0 || discordConnected) && <div className="space-y-2">
                  <Label className="text-xs text-white/40 font-['Inter'] tracking-[-0.5px]">Your connected accounts</Label>
                  <div className="flex flex-wrap gap-2">
                    {socialAccounts.map(account => <div key={account.id} className="flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded-md text-xs">
                        {account.platform === 'tiktok' && <img src={tiktokLogo} alt="" className="h-3 w-3" />}
                        {account.platform === 'instagram' && <img src={instagramLogo} alt="" className="h-3 w-3" />}
                        <span className="text-white/80">@{account.username}</span>
                      </div>)}
                    {discordConnected && <div className="flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded-md text-xs">
                        <img src={discordIcon} alt="" className="h-3 w-3" />
                        <span className="text-white/80">Discord</span>
                      </div>}
                  </div>
                </div>}

              {/* Video Upload Section */}
              <div className="space-y-3">
                <Label className="text-white font-medium font-['Inter'] tracking-[-0.5px]">
                  Example Video *
                </Label>
                <p className="text-xs text-white/50 font-['Inter'] tracking-[-0.5px]">
                  Show us your content style with a video link or upload
                </p>
                
                {/* Upload or URL Toggle Area */}
                {!uploadedVideoFile ? <div className="space-y-3">
                    {/* Upload Button */}
                    <input ref={fileInputRef} type="file" accept="video/*" onChange={e => e.target.files?.[0] && handleVideoUpload(e.target.files[0])} className="hidden" />
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full flex flex-col items-center justify-center gap-2 p-6 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group">
                      <Upload className="h-8 w-8 text-white/40 group-hover:text-white/60" />
                      <span className="text-sm text-white/60 group-hover:text-white/80 font-['Inter'] tracking-[-0.5px]">
                        Click to upload video
                      </span>
                      <span className="text-xs text-white/30 font-['Inter'] tracking-[-0.5px]">MP4, MOV up to 100MB</span>
                    </button>
                    
                    {/* Or divider */}
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-white/10" />
                      </div>
                      <div className="relative flex justify-center text-xs">
                        <span className="bg-[#0a0a0a] px-2 text-white/30 font-['Inter'] tracking-[-0.5px]">or paste URL</span>
                      </div>
                    </div>
                    
                    {/* URL Input */}
                    <div className="relative">
                      <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                      <Input type="url" value={videoUrl} onChange={e => setVideoUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..." className="pl-10 bg-white/5 border-transparent text-white placeholder:text-white/30 font-['Inter'] tracking-[-0.5px]" />
                    </div>
                  </div> : (/* Video Preview */
                <div className="relative rounded-lg overflow-hidden bg-black/20">
                    <video src={uploadedVideoPreview || ''} className="w-full max-h-48 object-contain" controls />
                    <button type="button" onClick={removeUploadedVideo} className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors">
                      <X className="h-4 w-4" />
                    </button>
                  </div>)}
              </div>

              <div>
                <Label htmlFor="application_text" className="text-white mb-2 block font-['Inter'] tracking-[-0.5px]">
                  Why are you a good fit? (Optional)
                </Label>
                <Textarea id="application_text" value={applicationText} onChange={e => setApplicationText(e.target.value)} placeholder="Tell the brand why you'd be perfect for this boost..." className="bg-white/5 border-transparent text-white placeholder:text-white/30 min-h-[100px] resize-none font-['Inter'] tracking-[-0.5px]" />
              </div>

              <div className="flex gap-3 pt-4 sticky bottom-0 bg-[#0a0a0a] py-4 -mx-6 px-6">
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="flex-1 text-white hover:bg-white/5 font-['Inter'] tracking-[-0.5px]" disabled={submitting || isUploading}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting || isFull || isUploading || !videoUrl.trim() && !uploadedVideoFile} className="flex-1 bg-[#2060de] hover:bg-[#2060de]/90 text-white disabled:opacity-50 font-['Inter'] tracking-[-0.5px]" style={{
                  borderTop: '1px solid #4b85f7'
                }}>
                  {isUploading ? "Uploading..." : submitting ? "Submitting..." : isFull ? "No Spots Available" : "Submit Application"}
                </Button>
              </div>
            </form>}
              </div>
            </>
        </SheetContent>
      </Sheet>
    </>;
}