import { useState, useCallback } from "react";
import { Upload, X, Image, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ScreenshotUploadProps {
  value?: File | null;
  onChange: (file: File | null) => void;
  previewUrl?: string;
  disabled?: boolean;
  error?: string;
  maxSizeMB?: number;
  className?: string;
}

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

export function ScreenshotUpload({
  value,
  onChange,
  previewUrl,
  disabled = false,
  error,
  maxSizeMB = 10,
  className,
}: ScreenshotUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const validateFile = useCallback(
    (file: File): string | null => {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        return "Please upload a PNG, JPG, WebP, or GIF image";
      }
      if (file.size > maxSizeMB * 1024 * 1024) {
        return `File size must be less than ${maxSizeMB}MB`;
      }
      return null;
    },
    [maxSizeMB]
  );

  const handleFile = useCallback(
    (file: File) => {
      const validationError = validateFile(file);
      if (validationError) {
        setValidationError(validationError);
        return;
      }

      setValidationError(null);

      // Create local preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setLocalPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      onChange(file);
    },
    [validateFile, onChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      if (disabled) return;

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFile(file);
      }
    },
    [disabled, handleFile]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled) {
        setIsDragging(true);
      }
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const handleRemove = useCallback(() => {
    setLocalPreview(null);
    setValidationError(null);
    onChange(null);
  }, [onChange]);

  const displayPreview = localPreview || previewUrl;
  const displayError = validationError || error;

  return (
    <div className={cn("space-y-2", className)}>
      {displayPreview ? (
        <div className="relative rounded-lg overflow-hidden border bg-muted/30">
          <img
            src={displayPreview}
            alt="Screenshot preview"
            className="w-full h-auto max-h-[300px] object-contain"
          />
          {!disabled && (
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2 h-8 w-8"
              onClick={handleRemove}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          <div className="absolute bottom-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded bg-black/60 text-white text-xs">
            <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
            Screenshot attached
          </div>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={cn(
            "relative border-2 border-dashed rounded-lg p-8 text-center transition-colors",
            isDragging && !disabled
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-muted-foreground/50",
            disabled && "opacity-50 cursor-not-allowed",
            displayError && "border-destructive"
          )}
        >
          <input
            type="file"
            accept={ACCEPTED_TYPES.join(",")}
            onChange={handleInputChange}
            disabled={disabled}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          />
          <div className="flex flex-col items-center gap-3">
            <div
              className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center",
                isDragging ? "bg-primary/10" : "bg-muted"
              )}
            >
              {isDragging ? (
                <Upload className="h-6 w-6 text-primary" />
              ) : (
                <Image className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <div>
              <p className="font-medium">
                {isDragging ? "Drop your screenshot here" : "Upload screenshot"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Drag and drop or click to browse
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                PNG, JPG, WebP, or GIF up to {maxSizeMB}MB
              </p>
            </div>
          </div>
        </div>
      )}

      {displayError && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {displayError}
        </div>
      )}
    </div>
  );
}

interface ScreenshotUploadWithStatusProps extends ScreenshotUploadProps {
  isUploading?: boolean;
  uploadProgress?: number;
}

export function ScreenshotUploadWithStatus({
  isUploading,
  uploadProgress,
  ...props
}: ScreenshotUploadWithStatusProps) {
  if (isUploading) {
    return (
      <div className="border-2 border-dashed rounded-lg p-8 text-center border-primary/50 bg-primary/5">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <div>
            <p className="font-medium">Uploading screenshot...</p>
            {uploadProgress !== undefined && (
              <p className="text-sm text-muted-foreground mt-1">
                {Math.round(uploadProgress)}% complete
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return <ScreenshotUpload {...props} />;
}
