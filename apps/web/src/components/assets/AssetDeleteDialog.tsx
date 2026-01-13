import { Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAssetDelete } from "@/hooks/assets/useAssetUpload";
import type { BrandAsset } from "@/types/assets";

interface AssetDeleteDialogProps {
  asset: BrandAsset | null;
  brandId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AssetDeleteDialog({
  asset,
  brandId,
  open,
  onOpenChange,
}: AssetDeleteDialogProps) {
  const deleteMutation = useAssetDelete();

  if (!asset) return null;

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync({
        assetId: asset.id,
        brandId,
      });
      toast.success("Asset deleted");
      onOpenChange(false);
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete asset");
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete Asset
          </AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete <strong>"{asset.name}"</strong>? This
            action cannot be undone and will permanently remove the asset
            {asset.type !== "link" && " and its file"} from your library.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {asset.download_count > 0 && (
          <div className="rounded-lg border border-warning/50 bg-warning/10 p-3 text-sm">
            <p className="text-warning-foreground">
              This asset has been downloaded {asset.download_count} time
              {asset.download_count !== 1 && "s"}. Creators may be using it in their
              content.
            </p>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteMutation.isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleteMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
