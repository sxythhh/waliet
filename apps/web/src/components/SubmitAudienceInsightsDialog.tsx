import { useState, useRef, useEffect, useCallback } from "react";
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
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  const { resolvedTheme } = useTheme();

  // Cleanup progress interval helper
  const clearProgressInterval = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  // Clear state when dialog closes
  useEffect(() => {
    if (!open) {
      setVideoFile(null);
      setUploadProgress(0);
      clearProgressInterval();
    }
  }, [open, clearProgressInterval]);

  // Fetch previous submissions
  const fetchPreviousSubmissions = useCallback(async () => {
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
  }, [socialAccountId]);

  // Fetch previous submissions when dialog opens
  useEffect(() => {
    if (open && socialAccountId) {
      fetchPreviousSubmissions();
    }
  }, [open, socialAccountId, fetchPreviousSubmissions]);

  const getPlatformIcon = (platformName: string) => {
    const iconClass = "h-5 w-5";
    const isDark = resolvedTheme === 'dark';
    switch (platformName.toLowerCase()) {
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
        setUploading(false);
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

      // Upload video to R2 via edge function
      setUploadProgress(0);
      clearProgressInterval();
      progressIntervalRef.current = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 15;
        });
      }, 300);

      // Create form data for upload
      const formData = new FormData();
      formData.append('file', videoFile);
      formData.append('userId', session.user.id);
      formData.append('socialAccountId', socialAccountId);

      // Upload to R2 via edge function
      let uploadResponse: Response;
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        if (!supabaseUrl) {
          throw new Error('Application configuration error. Please refresh and try again.');
        }

        uploadResponse = await fetch(
          `${supabaseUrl}/functions/v1/upload-demographics-video`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
            },
            body: formData,
          }
        );
      } catch (fetchError: unknown) {
        clearProgressInterval();
        setUploadProgress(0);
        // Handle network errors specifically
        if (fetchError instanceof TypeError && fetchError.message === 'Failed to fetch') {
          throw new Error('Network error. Please check your internet connection and try again.');
        }
        const errorMessage = fetchError instanceof Error ? fetchError.message : 'Failed to connect to upload service';
        throw new Error(errorMessage);
      }

      clearProgressInterval();

      if (!uploadResponse.ok) {
        setUploadProgress(0);
        const errorData = await uploadResponse.json().catch(() => ({}));
        throw new Error(errorData.error || `Upload failed (status ${uploadResponse.status})`);
      }

      const uploadResult = await uploadResponse.json();
      if (!uploadResult.success) {
        setUploadProgress(0);
        throw new Error(uploadResult.error || 'Upload failed');
      }

      setUploadProgress(100);
      const publicUrl = uploadResult.url;

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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to submit audience insights";
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
      clearProgressInterval();
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

    // Validate file size (max 15MB - compressed videos only)
    if (file.size > 15 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Video must be less than 15MB. Try compressing the video or reducing resolution."
      });
      return;
    }
    setVideoFile(file);
  };

  return <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden bg-background border-border [&>button]:hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <h2 className="text-lg font-semibold font-inter tracking-[-0.5px]">
            Submit Audience Insights
          </h2>

          {/* Account Label */}
          <div className="inline-flex items-center gap-2 mt-3 px-3 py-2 rounded-xl bg-muted/60 dark:bg-muted/40">
            <div className="w-6 h-6 rounded-lg bg-white dark:bg-background flex items-center justify-center flex-shrink-0">
              {getPlatformIcon(platform)}
            </div>
            <span className="text-sm font-medium font-inter tracking-[-0.3px]">
              @{username}
            </span>
          </div>

          <p className="text-sm text-muted-foreground font-inter tracking-[-0.3px] mt-4">
            Audience insights help brands understand your follower demographics. Accounts with verified insights get prioritized for campaign invites and higher payouts.
          </p>
        </div>

        {/* Content */}
        <div className="px-6 pb-6 space-y-4">
          {/* Previous Submissions */}
          {!loadingSubmissions && previousSubmissions.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground font-inter tracking-[-0.3px] uppercase">Previous Submissions</p>
              <div className="space-y-1.5 max-h-[100px] overflow-y-auto">
                {previousSubmissions.map((submission) => {
                  const statusConfig = getStatusConfig(submission.status);
                  const StatusIcon = statusConfig.icon;
                  return (
                    <div
                      key={submission.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-muted/50 dark:bg-muted/30"
                    >
                      <div className="flex items-center gap-2">
                        <StatusIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground font-inter tracking-[-0.3px]">
                          {format(new Date(submission.submitted_at), 'MMM d, yyyy')}
                        </span>
                      </div>
                      <span className={`text-xs font-medium font-inter tracking-[-0.3px] px-2 py-0.5 rounded-full ${
                        submission.status === 'approved'
                          ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                          : submission.status === 'rejected'
                            ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                      }`}>
                        {statusConfig.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Pending Warning */}
          {hasPendingSubmission && (
            <div className="p-3.5 rounded-xl bg-amber-500/10">
              <p className="text-sm text-amber-600 dark:text-amber-400 font-inter tracking-[-0.3px]">
                You have a pending submission being reviewed. You cannot submit again until it's processed.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Video Upload */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground font-inter tracking-[-0.3px] uppercase">Upload Video</p>

              <div
                className={`rounded-xl p-6 text-center cursor-pointer transition-colors ${
                  videoFile
                    ? 'bg-primary/5 dark:bg-primary/10'
                    : 'bg-muted/50 dark:bg-muted/30 hover:bg-muted/80 dark:hover:bg-muted/50'
                }`}
                onClick={() => !uploading && fileInputRef.current?.click()}
              >
                {videoFile ? (
                  <div className="space-y-2">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                      <CheckCircle2 className="h-6 w-6 text-primary" />
                    </div>
                    <p className="text-sm font-medium font-inter tracking-[-0.3px] truncate max-w-[250px] mx-auto">
                      {videoFile.name}
                    </p>
                    <p className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">
                      {!uploading && 'Click to change'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="w-12 h-12 rounded-full bg-muted dark:bg-muted/50 flex items-center justify-center mx-auto">
                      <Upload className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium font-inter tracking-[-0.3px]">
                      Click to upload video
                    </p>
                    <p className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">
                      MP4, MOV up to 15MB
                    </p>
                  </div>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="video/*" onChange={handleFileChange} className="hidden" required />
            </div>

            {/* Upload Progress */}
            {uploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground font-inter tracking-[-0.3px]">
                  <span>Uploading...</span>
                  <span>{Math.round(uploadProgress)}%</span>
                </div>
                <Progress value={uploadProgress} className="h-1.5" />
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border/50 flex gap-3">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex-1 h-11 rounded-xl bg-muted/60 dark:bg-muted/40 hover:bg-muted transition-colors text-sm font-medium font-inter tracking-[-0.3px]"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={uploading || hasPendingSubmission || !videoFile}
            className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-medium font-inter tracking-[-0.3px] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? "Uploading..." : "Submit"}
          </button>
        </div>
      </DialogContent>
    </Dialog>;
}
