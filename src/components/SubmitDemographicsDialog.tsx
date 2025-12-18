import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, CheckCircle2 } from "lucide-react";
import tiktokLogo from "@/assets/tiktok-logo-white.png";
import instagramLogo from "@/assets/instagram-logo-white.png";
import youtubeLogo from "@/assets/youtube-logo-white.png";
interface SubmitDemographicsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  socialAccountId: string;
  platform: string;
  username: string;
}
export function SubmitDemographicsDialog({
  open,
  onOpenChange,
  onSuccess,
  socialAccountId,
  platform,
  username
}: SubmitDemographicsDialogProps) {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    toast
  } = useToast();
  const getPlatformIcon = (platform: string) => {
    const iconClass = "h-5 w-5";
    switch (platform.toLowerCase()) {
      case "tiktok":
        return <img src={tiktokLogo} alt="TikTok" className={iconClass} />;
      case "instagram":
        return <img src={instagramLogo} alt="Instagram" className={iconClass} />;
      case "youtube":
        return <img src={youtubeLogo} alt="YouTube" className={iconClass} />;
      default:
        return null;
    }
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoFile) {
      toast({
        variant: "destructive",
        title: "Video Required",
        description: "Please upload a video showing your audience demographics"
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
          description: "You must be logged in to submit demographics"
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
        description: "Demographics submitted successfully. Admin will review your submission."
      });

      // Reset form
      setVideoFile(null);
      onOpenChange(false);
      
      // Delay to ensure database write is fully committed before refreshing
      // This prevents race conditions where the query returns stale data
      console.log('Demographic submission successful, waiting before refresh...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Refreshing social accounts...');
      onSuccess();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to submit demographics"
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
      <DialogContent className="sm:max-w-[480px] bg-neutral-950" style={{
      fontFamily: 'Inter',
      letterSpacing: '-0.5px'
    }}>
        <DialogHeader>
          <DialogTitle style={{
          fontFamily: 'Inter',
          letterSpacing: '-0.5px'
        }}>Submit Account Demographics</DialogTitle>
          <DialogDescription style={{
          fontFamily: 'Inter',
          letterSpacing: '-0.3px'
        }}>
            Upload a video showing your audience demographics
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Account Display */}
          

          {/* Video Upload */}
          <div className="space-y-2">
            <Label style={{
            fontFamily: 'Inter',
            letterSpacing: '-0.3px'
          }}>Demographics Video</Label>
            
            <div className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary hover:bg-muted/50 transition-colors" onClick={() => !uploading && fileInputRef.current?.click()}>
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
            {uploading ? "Uploading..." : "Submit Demographics"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>;
}