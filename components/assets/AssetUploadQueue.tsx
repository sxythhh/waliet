import { useState, useEffect, useCallback, useRef } from "react";
import { Icon } from "@iconify/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useAssetUpload } from "@/hooks/assets/useAssetUpload";
import {
  cleanupFilename,
  generateScreenshotName,
  detectAssetType,
  formatFileSize,
} from "@/lib/assetUtils";

export interface QueuedFile {
  id: string;
  file: File;
  name: string;
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
  progress: number;
}

interface AssetUploadQueueProps {
  brandId: string;
  files: File[];
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  isScreenshot?: boolean;
}

export function AssetUploadQueue({
  brandId,
  files,
  isOpen,
  onClose,
  onComplete,
  isScreenshot = false,
}: AssetUploadQueueProps) {
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const uploadMutation = useAssetUpload();
  const processingRef = useRef(false);
  const cancelledRef = useRef(false);

  // Initialize queue when files change
  useEffect(() => {
    if (files.length > 0 && isOpen) {
      const queuedFiles: QueuedFile[] = files.map((file, index) => ({
        id: `${Date.now()}-${index}`,
        file,
        name: isScreenshot && index === 0
          ? generateScreenshotName()
          : cleanupFilename(file.name),
        status: "pending",
        progress: 0,
      }));
      setQueue(queuedFiles);
      setCurrentIndex(0);
      setIsPaused(false);
      setIsComplete(false);
      processingRef.current = false;
      cancelledRef.current = false;
    }
  }, [files, isOpen, isScreenshot]);

  // Process queue sequentially
  const processNext = useCallback(async () => {
    if (processingRef.current || cancelledRef.current || isPaused) return;

    const pendingIndex = queue.findIndex((f) => f.status === "pending");
    if (pendingIndex === -1) {
      // All done
      setIsComplete(true);
      // Auto-close after a short delay if all succeeded
      const hasErrors = queue.some((f) => f.status === "error");
      if (!hasErrors) {
        setTimeout(() => {
          onComplete();
          onClose();
        }, 1000);
      }
      return;
    }

    processingRef.current = true;
    setCurrentIndex(pendingIndex);

    // Update status to uploading
    setQueue((prev) =>
      prev.map((f, i) =>
        i === pendingIndex ? { ...f, status: "uploading", progress: 0 } : f
      )
    );

    const queuedFile = queue[pendingIndex];

    try {
      // Simulate progress updates (actual upload doesn't provide progress)
      const progressInterval = setInterval(() => {
        setQueue((prev) =>
          prev.map((f, i) =>
            i === pendingIndex && f.status === "uploading"
              ? { ...f, progress: Math.min(f.progress + 10, 90) }
              : f
          )
        );
      }, 200);

      await uploadMutation.mutateAsync({
        brand_id: brandId,
        name: queuedFile.name,
        type: detectAssetType(queuedFile.file.type),
        file: queuedFile.file,
      });

      clearInterval(progressInterval);

      // Mark as success
      setQueue((prev) =>
        prev.map((f, i) =>
          i === pendingIndex ? { ...f, status: "success", progress: 100 } : f
        )
      );
    } catch (error) {
      // Mark as error
      setQueue((prev) =>
        prev.map((f, i) =>
          i === pendingIndex
            ? {
                ...f,
                status: "error",
                error:
                  error instanceof Error
                    ? error.message
                    : "Upload failed",
                progress: 0,
              }
            : f
        )
      );

      // Pause on error to let user decide
      setIsPaused(true);
    }

    processingRef.current = false;
  }, [queue, isPaused, brandId, uploadMutation, onComplete, onClose]);

  // Start processing when queue is ready and not paused
  useEffect(() => {
    if (queue.length > 0 && !isPaused && !isComplete && isOpen) {
      processNext();
    }
  }, [queue, isPaused, isComplete, isOpen, processNext]);

  const handleContinue = () => {
    // Skip the errored file and continue
    setIsPaused(false);
  };

  const handleRetry = () => {
    // Reset the errored file to pending and continue
    const errorIndex = queue.findIndex((f) => f.status === "error");
    if (errorIndex !== -1) {
      setQueue((prev) =>
        prev.map((f, i) =>
          i === errorIndex ? { ...f, status: "pending", error: undefined, progress: 0 } : f
        )
      );
    }
    setIsPaused(false);
  };

  const handleCancel = () => {
    cancelledRef.current = true;
    onComplete();
    onClose();
  };

  const handleClose = () => {
    if (isComplete || queue.every((f) => f.status !== "uploading")) {
      onComplete();
      onClose();
    }
  };

  const completedCount = queue.filter((f) => f.status === "success").length;
  const errorCount = queue.filter((f) => f.status === "error").length;
  const currentFile = queue[currentIndex];
  const hasError = queue.some((f) => f.status === "error");

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon
              icon={
                isComplete
                  ? hasError
                    ? "material-symbols:warning-outline"
                    : "material-symbols:check-circle-outline"
                  : "material-symbols:upload"
              }
              className={cn(
                "w-5 h-5",
                isComplete
                  ? hasError
                    ? "text-amber-500"
                    : "text-green-500"
                  : "text-primary"
              )}
            />
            {isComplete
              ? hasError
                ? "Upload Complete with Errors"
                : "Upload Complete"
              : `Uploading ${completedCount + 1} of ${queue.length}`}
          </DialogTitle>
          <DialogDescription>
            {isComplete
              ? `${completedCount} file${completedCount !== 1 ? "s" : ""} uploaded${
                  errorCount > 0
                    ? `, ${errorCount} failed`
                    : ""
                }`
              : "Please wait while your files are being uploaded..."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-[300px] overflow-y-auto">
          {queue.map((item, index) => (
            <div
              key={item.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                item.status === "uploading" && "border-primary/50 bg-primary/5",
                item.status === "success" && "border-green-500/30 bg-green-500/5",
                item.status === "error" && "border-red-500/30 bg-red-500/5",
                item.status === "pending" && "border-border/50 bg-muted/30"
              )}
            >
              {/* File type icon */}
              <div
                className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                  item.status === "uploading" && "bg-primary/10",
                  item.status === "success" && "bg-green-500/10",
                  item.status === "error" && "bg-red-500/10",
                  item.status === "pending" && "bg-muted"
                )}
              >
                <Icon
                  icon={
                    item.status === "success"
                      ? "material-symbols:check"
                      : item.status === "error"
                        ? "material-symbols:close"
                        : item.file.type.startsWith("image/")
                          ? "material-symbols:image-outline"
                          : item.file.type.startsWith("video/")
                            ? "material-symbols:videocam-outline"
                            : "material-symbols:description-outline"
                  }
                  className={cn(
                    "w-5 h-5",
                    item.status === "uploading" && "text-primary",
                    item.status === "success" && "text-green-500",
                    item.status === "error" && "text-red-500",
                    item.status === "pending" && "text-muted-foreground"
                  )}
                />
              </div>

              {/* File info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.name}</p>
                <p className="text-xs text-muted-foreground">
                  {item.status === "error"
                    ? item.error
                    : formatFileSize(item.file.size)}
                </p>

                {/* Progress bar for uploading */}
                {item.status === "uploading" && (
                  <Progress value={item.progress} className="h-1 mt-2" />
                )}
              </div>

              {/* Status indicator */}
              {item.status === "uploading" && (
                <Icon
                  icon="material-symbols:sync"
                  className="w-4 h-4 text-primary animate-spin"
                />
              )}
            </div>
          ))}
        </div>

        {/* Error actions */}
        {isPaused && hasError && (
          <div className="flex items-center gap-2 pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetry}
              className="flex-1 gap-1.5"
            >
              <Icon icon="material-symbols:refresh" className="w-4 h-4" />
              Retry
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleContinue}
              className="flex-1 gap-1.5"
            >
              <Icon icon="material-symbols:skip-next" className="w-4 h-4" />
              Skip & Continue
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="gap-1.5"
            >
              Cancel
            </Button>
          </div>
        )}

        {/* Close button when complete */}
        {isComplete && (
          <div className="flex justify-end pt-2 border-t">
            <Button onClick={handleClose} size="sm">
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
