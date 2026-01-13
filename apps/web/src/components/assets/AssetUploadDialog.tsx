import { useState, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Upload, FileText, X, Loader2, Link2, Image, Video } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { useAssetUpload, useAssetUpdate } from "@/hooks/assets/useAssetUpload";
import {
  FILE_SIZE_LIMITS,
  SUPPORTED_FILE_TYPES,
  formatFileSize,
} from "@/types/assets";
import type { AssetType, BrandAsset } from "@/types/assets";

const uploadSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  description: z.string().max(500).optional(),
  external_url: z.string().url("Invalid URL").optional().or(z.literal("")),
});

type UploadFormValues = z.infer<typeof uploadSchema>;

interface AssetUploadDialogProps {
  brandId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editAsset?: BrandAsset | null;
  onEditComplete?: () => void;
}

// All supported file types combined
const ALL_SUPPORTED_TYPES = [
  ...SUPPORTED_FILE_TYPES.image,
  ...SUPPORTED_FILE_TYPES.video,
  ...SUPPORTED_FILE_TYPES.document,
];

// Max file size (use the largest)
const MAX_FILE_SIZE = Math.max(
  FILE_SIZE_LIMITS.image,
  FILE_SIZE_LIMITS.video,
  FILE_SIZE_LIMITS.document
);

// Detect asset type from mime type
function detectAssetType(mimeType: string): AssetType {
  if (SUPPORTED_FILE_TYPES.image.includes(mimeType)) return "image";
  if (SUPPORTED_FILE_TYPES.video.includes(mimeType)) return "video";
  if (SUPPORTED_FILE_TYPES.document.includes(mimeType)) return "document";
  return "document"; // Default fallback
}

// Get icon for file type
function getFileIcon(mimeType: string) {
  const type = detectAssetType(mimeType);
  switch (type) {
    case "image":
      return <Image size={20} className="text-blue-400" />;
    case "video":
      return <Video size={20} className="text-purple-400" />;
    default:
      return <FileText size={20} className="text-orange-400" />;
  }
}

export function AssetUploadDialog({
  brandId,
  open,
  onOpenChange,
  editAsset,
  onEditComplete,
}: AssetUploadDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const uploadMutation = useAssetUpload();
  const updateMutation = useAssetUpdate();

  const isEditing = !!editAsset;

  const form = useForm<UploadFormValues>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      name: "",
      description: "",
      external_url: "",
    },
  });

  const externalUrl = form.watch("external_url");
  const hasUrl = externalUrl && externalUrl.trim().length > 0;

  // Reset form when dialog opens/closes or editAsset changes
  useEffect(() => {
    if (open) {
      if (editAsset) {
        form.reset({
          name: editAsset.name,
          description: editAsset.description || "",
          external_url: editAsset.external_url || "",
        });
        setSelectedFile(null);
      } else {
        form.reset({
          name: "",
          description: "",
          external_url: "",
        });
        setSelectedFile(null);
      }
    }
  }, [open, editAsset, form]);

  const handleFileSelect = useCallback(
    (file: File) => {
      if (!ALL_SUPPORTED_TYPES.includes(file.type)) {
        toast.error("Unsupported file type. Please upload an image, video, or document.");
        return;
      }

      const detectedType = detectAssetType(file.type);
      const maxSize = FILE_SIZE_LIMITS[detectedType];

      if (file.size > maxSize) {
        toast.error(`File too large. Maximum for ${detectedType}s: ${formatFileSize(maxSize)}`);
        return;
      }

      setSelectedFile(file);
      // Clear URL when file is selected
      form.setValue("external_url", "");

      // Auto-fill name if empty
      if (!form.getValues("name")) {
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
        form.setValue("name", nameWithoutExt);
      }
    },
    [form]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  const onSubmit = async (values: UploadFormValues) => {
    try {
      if (isEditing && editAsset) {
        // Update existing asset
        await updateMutation.mutateAsync({
          assetId: editAsset.id,
          brandId,
          input: {
            name: values.name,
            description: values.description || null,
            external_url: editAsset.type === "link" ? values.external_url : undefined,
          },
        });
        toast.success("Asset updated");
        onEditComplete?.();
      } else {
        // Determine if it's a link or file upload
        const isLink = hasUrl && !selectedFile;

        if (!isLink && !selectedFile) {
          toast.error("Please select a file or enter a URL");
          return;
        }

        const assetType: AssetType = isLink
          ? "link"
          : detectAssetType(selectedFile!.type);

        await uploadMutation.mutateAsync({
          brand_id: brandId,
          name: values.name,
          description: values.description,
          type: assetType,
          file: selectedFile || undefined,
          external_url: isLink ? values.external_url : undefined,
        });
        toast.success("Asset uploaded successfully");
      }

      onOpenChange(false);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(isEditing ? "Failed to update asset" : "Failed to upload asset");
    }
  };

  const isLoading = uploadMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-inter tracking-[-0.5px]">
            {isEditing ? "Edit Asset" : "Add Asset"}
          </DialogTitle>
          <DialogDescription className="font-inter tracking-[-0.3px]">
            {isEditing
              ? "Update the asset details below."
              : "Upload a file or add a link to your brand library."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* File Upload Area (only when not editing) */}
            {!isEditing && (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={cn(
                  "flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 transition-all",
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50",
                  selectedFile && "border-primary/50 bg-primary/5",
                  hasUrl && "opacity-50 pointer-events-none"
                )}
              >
                {selectedFile ? (
                  <div className="flex items-center gap-3 w-full">
                    <div className="rounded-lg bg-muted p-2.5">
                      {getFileIcon(selectedFile.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium font-inter tracking-[-0.3px]">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">
                        {formatFileSize(selectedFile.size)} · {detectAssetType(selectedFile.type)}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setSelectedFile(null)}
                    >
                      <X size={16} />
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="rounded-full bg-muted p-3 mb-3">
                      <Upload className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-foreground font-inter tracking-[-0.3px]">
                      Drag & drop or{" "}
                      <label className="cursor-pointer text-primary hover:underline">
                        browse
                        <input
                          type="file"
                          className="hidden"
                          accept={ALL_SUPPORTED_TYPES.join(",")}
                          onChange={handleFileInput}
                        />
                      </label>
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground font-inter tracking-[-0.3px]">
                      Images, videos, or documents up to {formatFileSize(MAX_FILE_SIZE)}
                    </p>
                  </>
                )}
              </div>
            )}

            {/* OR Divider (only when not editing and no file) */}
            {!isEditing && !selectedFile && (
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-background px-2 text-muted-foreground font-inter">
                    or add a link
                  </span>
                </div>
              </div>
            )}

            {/* External URL (for new assets, or when editing a link) */}
            {(!isEditing || editAsset?.type === "link") && !selectedFile && (
              <FormField
                control={form.control}
                name="external_url"
                render={({ field }) => (
                  <FormItem>
                    {isEditing && <FormLabel className="font-inter tracking-[-0.3px]">URL</FormLabel>}
                    <FormControl>
                      <div className="relative">
                        <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="https://example.com/resource"
                          className="pl-9 font-inter tracking-[-0.3px]"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-inter tracking-[-0.3px]">Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Asset name"
                      className="font-inter tracking-[-0.3px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-inter tracking-[-0.3px]">
                    Description <span className="text-muted-foreground font-normal">(optional)</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Brief description of this asset..."
                      rows={2}
                      className="font-inter tracking-[-0.3px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
                className="font-inter tracking-[-0.3px]"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="font-inter tracking-[-0.3px]"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Save" : "Add Asset"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
