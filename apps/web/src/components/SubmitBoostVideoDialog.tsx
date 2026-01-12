import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
} from "lucide-react";

interface SubmitBoostVideoDialogProps {
  boostId: string;
  brandId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  revisionOf?: string;
}

// Validate Google Drive URL
function isValidGoogleDriveUrl(url: string): boolean {
  const patterns = [
    /^https?:\/\/(drive\.google\.com|docs\.google\.com)/i,
    /^https?:\/\/.*\.googleusercontent\.com/i,
  ];
  return patterns.some((pattern) => pattern.test(url));
}

// Extract file ID from Google Drive URL
function extractGoogleDriveFileId(url: string): string | null {
  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/,
    /id=([a-zA-Z0-9_-]+)/,
    /\/d\/([a-zA-Z0-9_-]+)/,
    /open\?id=([a-zA-Z0-9_-]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

export function SubmitBoostVideoDialog({
  boostId,
  brandId,
  open,
  onOpenChange,
  onSuccess,
  revisionOf,
}: SubmitBoostVideoDialogProps) {
  const [gdriveUrl, setGdriveUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [notes, setNotes] = useState("");
  const [durationSeconds, setDurationSeconds] = useState<number | "">("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [urlValidation, setUrlValidation] = useState<{
    valid: boolean;
    fileId: string | null;
    fileName: string | null;
    mimeType: string | null;
    thumbnailUrl: string | null;
    message: string;
  } | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setGdriveUrl("");
      setCaption("");
      setNotes("");
      setDurationSeconds("");
      setUrlValidation(null);
      setAcknowledged(false);
    }
  }, [open]);

  // Validate URL when it changes
  useEffect(() => {
    if (!gdriveUrl) {
      setUrlValidation(null);
      return;
    }

    const timeoutId = setTimeout(() => {
      validateUrl(gdriveUrl);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [gdriveUrl]);

  const validateUrl = async (url: string) => {
    setIsValidating(true);

    try {
      // Quick client-side check first
      if (!isValidGoogleDriveUrl(url)) {
        setUrlValidation({
          valid: false,
          fileId: null,
          fileName: null,
          mimeType: null,
          thumbnailUrl: null,
          message: "Please enter a valid Google Drive URL",
        });
        return;
      }

      const fileId = extractGoogleDriveFileId(url);
      if (!fileId) {
        setUrlValidation({
          valid: false,
          fileId: null,
          fileName: null,
          mimeType: null,
          thumbnailUrl: null,
          message: "Could not extract file ID from URL",
        });
        return;
      }

      // Server-side validation via Edge Function
      const { data, error } = await supabase.functions.invoke("validate-gdrive-access", {
        body: { fileUrl: url },
      });

      if (error) {
        console.error("GDrive validation error:", error);
        setUrlValidation({
          valid: false,
          fileId: null,
          fileName: null,
          mimeType: null,
          thumbnailUrl: null,
          message: "Failed to validate file. Please try again.",
        });
        return;
      }

      if (!data.valid) {
        setUrlValidation({
          valid: false,
          fileId: null,
          fileName: null,
          mimeType: null,
          thumbnailUrl: null,
          message: data.error || "Unable to access video file",
        });
        return;
      }

      // Validation passed with metadata
      setUrlValidation({
        valid: true,
        fileId: data.fileId,
        fileName: data.fileName,
        mimeType: data.mimeType,
        thumbnailUrl: data.thumbnailUrl,
        message: `Verified: ${data.fileName || "Video file"}`,
      });
    } catch (err) {
      console.error("Validation error:", err);
      setUrlValidation({
        valid: false,
        fileId: null,
        fileName: null,
        mimeType: null,
        thumbnailUrl: null,
        message: "Failed to validate file. Please try again.",
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleSubmit = async () => {
    if (!gdriveUrl || !urlValidation?.valid) {
      toast.error("Please enter a valid Google Drive link");
      return;
    }

    if (!caption.trim()) {
      toast.error("Please enter a caption for the video");
      return;
    }

    if (!acknowledged) {
      toast.error("Please acknowledge that your video is ready for review");
      return;
    }

    setIsSubmitting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please log in to submit a video");
        return;
      }

      // Create submission
      const { error } = await supabase
        .from("video_submissions")
        .insert({
          source_type: "boost",
          source_id: boostId,
          brand_id: brandId,
          creator_id: user.id,
          video_url: gdriveUrl,
          gdrive_url: gdriveUrl,
          gdrive_file_id: urlValidation.fileId,
          gdrive_validated: true,
          gdrive_access_validated: true,
          gdrive_access_checked_at: new Date().toISOString(),
          gdrive_file_name: urlValidation.fileName,
          gdrive_mime_type: urlValidation.mimeType,
          gdrive_thumbnail_url: urlValidation.thumbnailUrl,
          caption: caption.trim(),
          submission_notes: notes.trim() || null,
          duration_seconds: durationSeconds || null,
          status: "pending",
          revision_of: revisionOf || null,
          revision_number: revisionOf ? 1 : 0,
        });

      if (error) throw error;

      toast.success("Video submitted successfully!");
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("Error submitting video:", error);
      toast.error(error.message || "Failed to submit video");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl p-0 overflow-hidden gap-0">
        <div className="flex flex-col md:flex-row">
          {/* Left Side - Submission Checklist */}
          <div className="w-full md:w-[320px] bg-[#0a0a0a] p-6 text-white shrink-0">
            <h2 className="text-lg font-semibold mb-3 tracking-[-0.5px] font-inter">
              Submission checklist
            </h2>
            <p className="text-sm text-white/70 mb-6 leading-relaxed tracking-[-0.3px] font-inter">
              Submit your raw video file via Google Drive. Make sure the file is accessible with "Anyone with the link can view".
            </p>

            <div className="space-y-4 mb-6">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-medium">1</span>
                </div>
                <p className="text-sm text-white/70 font-inter tracking-[-0.3px]">
                  Upload your video to Google Drive
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-medium">2</span>
                </div>
                <p className="text-sm text-white/70 font-inter tracking-[-0.3px]">
                  Set sharing to "Anyone with the link"
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-medium">3</span>
                </div>
                <p className="text-sm text-white/70 font-inter tracking-[-0.3px]">
                  Copy the link and paste it here
                </p>
              </div>
            </div>

            <div className="border-t border-white/10 pt-6 mt-auto">
              <h3 className="text-sm font-semibold mb-2 tracking-[-0.3px] font-inter">
                Important
              </h3>
              <p className="text-sm text-white/70 leading-relaxed tracking-[-0.3px] font-inter">
                The brand will post this video on their channels. Include the caption you want used when posting.
              </p>
            </div>
          </div>

          {/* Right Side - Form */}
          <div className="flex-1 p-6 relative">
            {/* Close Button */}
            <button
              onClick={() => onOpenChange(false)}
              className="absolute right-4 top-4 rounded-full p-1.5 opacity-60 hover:opacity-100 hover:bg-muted transition-all"
            >
              <X className="w-4 h-4" />
              <span className="sr-only">Close</span>
            </button>

            <div className="space-y-5">
              {/* Google Drive URL */}
              <div className="space-y-2">
                <label className="text-sm font-medium tracking-[-0.3px] flex items-center gap-1 font-inter">
                  Google Drive Link <span className="text-primary">*</span>
                </label>
                <Input
                  value={gdriveUrl}
                  onChange={(e) => setGdriveUrl(e.target.value)}
                  placeholder="https://drive.google.com/file/d/..."
                  className="h-12 bg-muted/30 border border-zinc-300 dark:border-border/50 rounded-xl text-sm focus:border-primary/50 focus:ring-[#2060df]/20 font-inter tracking-[-0.3px]"
                />
                {/* Verification Status */}
                {isValidating && (
                  <div className="flex items-center gap-2 py-1">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                    <span className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">Verifying access...</span>
                  </div>
                )}
                {!isValidating && urlValidation && (
                  <div className={`flex items-center gap-2 py-1 ${urlValidation.valid ? '' : ''}`}>
                    {urlValidation.valid ? (
                      <>
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/10">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 font-inter tracking-[-0.3px]">Verified</span>
                        </div>
                        {urlValidation.fileName && (
                          <span className="text-xs text-muted-foreground font-inter tracking-[-0.3px] truncate max-w-[200px]">{urlValidation.fileName}</span>
                        )}
                      </>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-destructive" />
                        <span className="text-xs text-destructive font-inter tracking-[-0.3px]">{urlValidation.message}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Caption */}
              <div className="space-y-2">
                <label className="text-sm font-medium tracking-[-0.3px] flex items-center gap-1 font-inter">
                  Caption <span className="text-primary">*</span>
                </label>
                <Textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Enter the caption for this video..."
                  rows={3}
                  className="bg-muted/30 border border-zinc-300 dark:border-border/50 rounded-xl text-sm resize-none focus:border-primary/50 focus:ring-[#2060df]/20 font-inter tracking-[-0.3px]"
                />
              </div>

              {/* Notes (Optional) */}
              <div className="space-y-2">
                <label className="text-sm font-medium tracking-[-0.3px] font-inter">
                  Notes <span className="text-muted-foreground">(optional)</span>
                </label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any notes for the reviewer..."
                  className="h-12 bg-muted/30 border border-zinc-300 dark:border-border/50 rounded-xl text-sm focus:border-primary/50 focus:ring-[#2060df]/20 font-inter tracking-[-0.3px]"
                />
              </div>

              {/* Acknowledgment Checkbox */}
              <div className="flex items-center gap-2.5">
                <Checkbox
                  id="acknowledge"
                  checked={acknowledged}
                  onCheckedChange={(checked) => setAcknowledged(checked as boolean)}
                  className="border-muted-foreground/50 data-[state=checked]:bg-primary data-[state=checked]:border-primary data-[state=checked]:text-white"
                />
                <label
                  htmlFor="acknowledge"
                  className="text-sm text-muted-foreground cursor-pointer font-inter tracking-[-0.3px]"
                >
                  I confirm this video is ready for review and follows the content guidelines
                </label>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end pt-2">
                <Button
                  onClick={handleSubmit}
                  disabled={
                    isSubmitting ||
                    !urlValidation?.valid ||
                    !caption.trim() ||
                    !acknowledged
                  }
                  className="h-11 px-6 rounded-xl font-medium bg-foreground hover:bg-foreground/90 text-background border-0 font-inter tracking-[-0.5px]"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Submitting...
                    </span>
                  ) : (
                    "Submit Video"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
