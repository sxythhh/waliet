import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/components/ThemeProvider";
import { supabase } from "@/integrations/supabase/client";
import { Upload, CheckCircle2, Clock, XCircle, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import tiktokLogoWhite from "@/assets/tiktok-logo-white.png";
import tiktokLogoBlack from "@/assets/tiktok-logo-black.png";
import instagramLogoWhite from "@/assets/instagram-logo-white.png";
import instagramLogoBlack from "@/assets/instagram-logo-black.png";
import youtubeLogoWhite from "@/assets/youtube-logo-white.png";
import youtubeLogoBlack from "@/assets/youtube-logo-black.png";

interface DemographicSubmission {
  id: string;
  status: string;
  submitted_at: string;
  tier1_percentage: number;
}

interface SubmitAudienceInsightsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  socialAccountId: string;
  platform: string;
  username: string;
}

export function SubmitAudienceInsightsDialog({
  open,
  onOpenChange,
  onSuccess,
  socialAccountId,
  platform,
  username
}: SubmitAudienceInsightsDialogProps) {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previousSubmissions, setPreviousSubmissions] = useState<DemographicSubmission[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { resolvedTheme } = useTheme();

  // Fetch previous submissions when dialog opens
  useEffect(() => {
    if (open && socialAccountId) {
      fetchPreviousSubmissions();
    }
  }, [open, socialAccountId]);

  const fetchPreviousSubmissions = async () => {
    setLoadingSubmissions(true);
    try {
      const { data, error } = await supabase
        .from('demographic_submissions')
        .select('id, status, submitted_at, tier1_percentage')
        .eq('social_account_id', socialAccountId)
        .order('submitted_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setPreviousSubmissions(data || []);
    } catch (error) {
      console.error('Error fetching submissions:', error);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const getPlatformIcon = (platform: string) => {
    const iconClass = "h-5 w-5";
    const isDark = resolvedTheme === 'dark';
    switch (platform.toLowerCase()) {
      case "tiktok":
        return <img src={isDark ? tiktokLogoWhite : tiktokLogoBlack} alt="TikTok" className={iconClass} />;
      case "instagram":
        return <img src={isDark ? instagramLogoWhite : instagramLogoBlack} alt="Instagram" className={iconClass} />;
      case "youtube":
        return <img src={isDark ? youtubeLogoWhite : youtubeLogoBlack} alt="YouTube" className={iconClass} />;
      default:
        return null;
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'approved':
        return { label: 'Approved', icon: CheckCircle, className: 'bg-green-500/20 text-green-400 border-green-500/30' };
      case 'rejected':
        return { label: 'Rejected', icon: XCircle, className: 'bg-red-500/20 text-red-400 border-red-500/30' };
      case 'pending':
      default:
        return { label: 'Pending', icon: Clock, className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' };
    }
  };

  const hasPendingSubmission = previousSubmissions.some(s => s.status === 'pending');
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoFile) {
      toast({
        variant: "destructive",
        title: "Video Required",
        description: "Please upload a video showing your audience insights"
      });
      return;
    }
    setUploading(true);
    try {
      const {
        data: {
          session
        }
      } = await supabase.auth.getSession();
      if (!session) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "You must be logged in to submit audience insights"
        });
        return;
      }

      // Check if there's a pending submission - cannot submit while one is pending
      const {
        data: pendingSubmission
      } = await supabase.from('demographic_submissions').select('status').eq('social_account_id', socialAccountId).eq('status', 'pending').limit(1).maybeSingle();
      
      if (pendingSubmission) {
        toast({
          variant: "destructive",
          title: "Review in Progress",
          description: "Your previous submission is still being reviewed"
        });
        setUploading(false);
        return;
      }

      // Upload video with progress simulation
      const fileExt = videoFile.name.split('.').pop();
      const fileName = `${session.user.id}/demographics_${socialAccountId}_${Date.now()}.${fileExt}`;

      // Simulate progress during upload
      setUploadProgress(0);
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 15;
        });
      }, 300);
      const {
        error: uploadError
      } = await supabase.storage.from('verification-screenshots').upload(fileName, videoFile);
      clearInterval(progressInterval);
      if (uploadError) {
        setUploadProgress(0);
        throw uploadError;
      }
      setUploadProgress(100);

      // Get public URL
      const {
        data: {
          publicUrl
        }
      } = supabase.storage.from('verification-screenshots').getPublicUrl(fileName);

      // Insert demographic submission (with tier1_percentage set to 0 as placeholder)
      const {
        error: insertError,
        data: submissionData
      } = await supabase.from('demographic_submissions').insert({
        social_account_id: socialAccountId,
        tier1_percentage: 0,
        // Placeholder value since we removed the input
        screenshot_url: publicUrl,
        status: 'pending'
      }).select().single();
      if (insertError) {
        // Handle unique constraint violation (race condition - another pending submission was created)
        if (insertError.code === '23505' || insertError.message?.includes('duplicate') || insertError.message?.includes('unique')) {
          toast({
            variant: "destructive",
            title: "Submission Already Pending",
            description: "You already have a pending submission for this account. Please wait for it to be reviewed."
          });
          // Refresh to show the latest status
          await fetchPreviousSubmissions();
          setUploading(false);
          return;
        }
        throw insertError;
      }

      // Get user profile and social account details
      const {
        data: profile
      } = await supabase.from('profiles').select('username, email').eq('id', session.user.id).single();
      const {
        data: account
      } = await supabase.from('social_accounts').select('platform, username').eq('id', socialAccountId).single();

      // Notify Discord webhook (non-blocking - don't fail if it fails)
      try {
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Webhook timeout')), 5000));
        const webhookPromise = supabase.functions.invoke('notify-demographic-submission', {
          body: {
            username: profile?.username || 'Unknown',
            email: profile?.email || 'Unknown',
            platform: account?.platform || platform,
            social_account_username: account?.username || username,
            video_url: publicUrl,
            submitted_at: submissionData?.submitted_at || new Date().toISOString()
          }
        });
        await Promise.race([webhookPromise, timeoutPromise]);
      } catch (webhookError) {
        console.error('Failed to send Discord notification (non-critical):', webhookError);
        // Don't fail the submission if webhook fails - it's non-critical
      }
      toast({
        title: "Success",
        description: "Audience insights submitted successfully. Admin will review your submission."
      });

      // Reset form
      setVideoFile(null);
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to submit audience insights"
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('video/')) {
      toast({
        variant: "destructive",
        title: "Invalid file",
        description: "Please upload a video file"
      });
      return;
    }

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Video must be less than 50MB"
      });
      return;
    }
    setVideoFile(file);
  };
  return <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]" style={{
      fontFamily: 'Inter',
      letterSpacing: '-0.5px'
    }}>
        <DialogHeader>
          <DialogTitle style={{
          fontFamily: 'Inter',
          letterSpacing: '-0.5px'
        }}>Share Audience Insights</DialogTitle>
          <DialogDescription style={{
          fontFamily: 'Inter',
          letterSpacing: '-0.3px'
        }}>
            Upload a video showing your audience insights
          </DialogDescription>
        </DialogHeader>

        {/* Account Info */}
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border border-border/50">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-background">
            {getPlatformIcon(platform)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" style={{ fontFamily: 'Inter', letterSpacing: '-0.3px' }}>
              @{username}
            </p>
            <p className="text-xs text-muted-foreground capitalize">{platform}</p>
          </div>
        </div>

        {/* Previous Submissions */}
        {!loadingSubmissions && previousSubmissions.length > 0 && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Previous Submissions</Label>
            <div className="space-y-2 max-h-[120px] overflow-y-auto">
              {previousSubmissions.map((submission) => {
                const statusConfig = getStatusConfig(submission.status);
                const StatusIcon = statusConfig.icon;
                return (
                  <div 
                    key={submission.id} 
                    className="flex items-center justify-between p-2 bg-muted/30 rounded-md border border-border/30"
                  >
                    <div className="flex items-center gap-2">
                      <StatusIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(submission.submitted_at), 'MMM d, yyyy')}
                      </span>
                    </div>
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${statusConfig.className}`}>
                      {statusConfig.label}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {hasPendingSubmission && (
          <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <p className="text-xs text-yellow-400" style={{ fontFamily: 'Inter', letterSpacing: '-0.3px' }}>
              You have a pending submission being reviewed. You cannot submit again until it's processed.
            </p>
          </div>
        )}


        <form onSubmit={handleSubmit} className="space-y-6">


          {/* Video Upload */}
          <div className="space-y-2">
            <Label style={{
            fontFamily: 'Inter',
            letterSpacing: '-0.3px'
          }}>Audience Insights Video</Label>
            
            <div className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => !uploading && fileInputRef.current?.click()}>
              {videoFile ? <div className="space-y-2">
                  <CheckCircle2 className="h-8 w-8 mx-auto text-primary" />
                  <p className="text-sm font-medium" style={{
                fontFamily: 'Inter',
                letterSpacing: '-0.3px'
              }}>{videoFile.name}</p>
                  <p className="text-xs text-muted-foreground">{!uploading && 'Click to change'}</p>
                </div> : <div className="space-y-2">
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground" style={{
                fontFamily: 'Inter',
                letterSpacing: '-0.3px'
              }}>Upload Video (Max 50MB)</p>
                  <p className="text-xs text-muted-foreground">MP4, MOV, or other video formats</p>
                </div>}
            </div>
            <input ref={fileInputRef} type="file" accept="video/*" onChange={handleFileChange} className="hidden" required />
          </div>

          {/* Upload Progress */}
          {uploading && <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Uploading...</span>
                <span>{Math.round(uploadProgress)}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>}

          {/* Submit Button */}
          <Button type="submit" className="w-full" disabled={uploading} style={{
          fontFamily: 'Inter',
          letterSpacing: '-0.3px'
        }}>
            {uploading ? "Uploading..." : "Submit Insights"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>;
}