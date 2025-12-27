import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, FileVideo, X, AlertTriangle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

interface SubmitAnalyticsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submissionId: string;
  videoTitle?: string;
  onSuccess?: () => void;
}

export function SubmitAnalyticsDialog({
  open,
  onOpenChange,
  submissionId,
  videoTitle,
  onSuccess
}: SubmitAnalyticsDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    if (!selectedFile.type.startsWith("video/")) {
      toast.error("Please select a video file");
      return;
    }

    // Validate file size (max 50MB)
    if (selectedFile.size > 50 * 1024 * 1024) {
      toast.error("File size must be less than 50MB");
      return;
    }

    setFile(selectedFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (!droppedFile) return;

    if (!droppedFile.type.startsWith("video/")) {
      toast.error("Please drop a video file");
      return;
    }

    if (droppedFile.size > 50 * 1024 * 1024) {
      toast.error("File size must be less than 50MB");
      return;
    }

    setFile(droppedFile);
  };

  const handleSubmit = async () => {
    if (!file) {
      toast.error("Please select a recording to upload");
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${submissionId}/${Date.now()}.${fileExt}`;

      // Simulate progress (actual progress tracking requires XMLHttpRequest)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("analytics-recordings")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false
        });

      clearInterval(progressInterval);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("analytics-recordings")
        .getPublicUrl(fileName);

      // Update the submission with the recording URL
      const { error: updateError } = await supabase
        .from("video_submissions")
        .update({
          analytics_recording_url: publicUrl,
          analytics_recording_uploaded_at: new Date().toISOString()
        } as any)
        .eq("id", submissionId);

      if (updateError) throw updateError;

      setUploadProgress(100);
      toast.success("Analytics recording uploaded successfully");
      
      setTimeout(() => {
        setFile(null);
        setUploadProgress(0);
        onOpenChange(false);
        onSuccess?.();
      }, 500);
    } catch (error: any) {
      console.error("Error uploading recording:", error);
      toast.error(error.message || "Failed to upload recording");
    } finally {
      setUploading(false);
    }
  };

  const removeFile = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-instrument tracking-tight">Submit Analytics Recording</DialogTitle>
          <DialogDescription className="font-inter tracking-[-0.3px]">
            Upload a screen recording of your TikTok/Instagram analytics dashboard to verify your video views.
            {videoTitle && (
              <span className="block mt-1 text-foreground font-medium">
                For: {videoTitle}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Warning */}
          <div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">
              <p className="font-medium text-foreground mb-1">Recording Requirements:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Show your analytics dashboard clearly</li>
                <li>Include the video title/thumbnail for identification</li>
                <li>Show the view count and date range</li>
                <li>Record in good quality (720p or higher)</li>
              </ul>
            </div>
          </div>

          {/* File Upload Area */}
          <div className="space-y-2">
            <Label className="font-inter tracking-[-0.3px] text-sm">Recording File</Label>
            
            {!file ? (
              <div
                className={cn(
                  "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
                  "hover:border-primary/50 hover:bg-muted/30",
                  "border-border/60"
                )}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
              >
                <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm font-inter tracking-[-0.3px] text-foreground mb-1">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">
                  MP4, MOV, or WebM (max 50MB)
                </p>
              </div>
            ) : (
              <div className="border border-border/60 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <FileVideo className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-inter tracking-[-0.3px] truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                  {!uploading && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-md"
                      onClick={removeFile}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {uploading && (
                  <div className="mt-3 space-y-2">
                    <Progress value={uploadProgress} className="h-1.5" />
                    <div className="flex items-center justify-between text-xs text-muted-foreground font-inter tracking-[-0.3px]">
                      <span>Uploading...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                  </div>
                )}

                {uploadProgress === 100 && (
                  <div className="mt-3 flex items-center gap-2 text-emerald-500">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-xs font-inter tracking-[-0.3px]">Upload complete</span>
                  </div>
                )}
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={uploading}
            className="font-inter tracking-[-0.3px]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={uploading || !file}
            className="font-inter tracking-[-0.3px]"
          >
            {uploading ? "Uploading..." : "Submit Recording"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}