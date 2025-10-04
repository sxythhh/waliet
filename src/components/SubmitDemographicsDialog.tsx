import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload } from "lucide-react";
import tiktokLogo from "@/assets/tiktok-logo.svg";
import instagramLogo from "@/assets/instagram-logo.svg";
import youtubeLogo from "@/assets/youtube-logo.svg";

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

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
        description: "Please upload a video showing your audience demographics",
      });
      return;
    }

    setUploading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "You must be logged in to submit demographics",
        });
        return;
      }

      // Check if user can submit (7 days since last submission)
      const { data: lastSubmission } = await supabase
        .from('demographic_submissions')
        .select('submitted_at')
        .eq('social_account_id', socialAccountId)
        .order('submitted_at', { ascending: false })
        .limit(1)
        .single();

      if (lastSubmission) {
        const daysSinceLastSubmission = Math.floor(
          (Date.now() - new Date(lastSubmission.submitted_at).getTime()) / (1000 * 60 * 60 * 24)
        );
        
        if (daysSinceLastSubmission < 7) {
          toast({
            variant: "destructive",
            title: "Too Soon",
            description: `You can submit again in ${7 - daysSinceLastSubmission} day(s)`,
          });
          setUploading(false);
          return;
        }
      }

      // Upload video
      const fileExt = videoFile.name.split('.').pop();
      const fileName = `${session.user.id}/demographics_${socialAccountId}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('verification-screenshots')
        .upload(fileName, videoFile);

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('verification-screenshots')
        .getPublicUrl(fileName);

      // Insert demographic submission (with tier1_percentage set to 0 as placeholder)
      const { error: insertError } = await supabase
        .from('demographic_submissions')
        .insert({
          social_account_id: socialAccountId,
          tier1_percentage: 0, // Placeholder value since we removed the input
          screenshot_url: publicUrl,
          status: 'pending',
        });

      if (insertError) {
        throw insertError;
      }

      toast({
        title: "Success",
        description: "Demographics submitted successfully. Admin will review your submission.",
      });

      // Reset form
      setVideoFile(null);
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to submit demographics",
      });
    } finally {
      setUploading(false);
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
        description: "Please upload a video file",
      });
      return;
    }

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Video must be less than 50MB",
      });
      return;
    }

    setVideoFile(file);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-card">
        <DialogHeader>
          <DialogTitle>Submit Account Demographics</DialogTitle>
          <DialogDescription>
            Upload a video showing your audience demographics
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Account Display */}
          <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 border">
            {getPlatformIcon(platform)}
            <div className="flex flex-col">
              <span className="font-semibold text-sm">@{username}</span>
              <span className="text-xs text-muted-foreground capitalize">{platform}</span>
            </div>
          </div>

          {/* Video Upload */}
          <div className="space-y-2">
            <Label>Demographics Video</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Record a video showing your audience demographics from your platform's analytics
            </p>
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {videoFile ? (
                <div className="space-y-2">
                  <Upload className="h-8 w-8 mx-auto text-primary" />
                  <p className="text-sm font-medium">{videoFile.name}</p>
                  <p className="text-xs text-muted-foreground">Click to change</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Upload Video (Max 50MB)</p>
                  <p className="text-xs text-muted-foreground">MP4, MOV, or other video formats</p>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileChange}
              className="hidden"
              required
            />
          </div>

          {/* Submit Button */}
          <Button type="submit" className="w-full" disabled={uploading}>
            {uploading ? "Submitting..." : "Submit Demographics"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}