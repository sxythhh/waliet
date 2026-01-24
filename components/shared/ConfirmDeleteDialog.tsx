import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

interface ConfirmDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void | Promise<void>;
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
  variant?: "destructive" | "default";
  itemName?: string;
}

export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  confirmText = "Delete Permanently",
  cancelText = "Cancel",
  loading = false,
  variant = "destructive",
  itemName,
}: ConfirmDeleteDialogProps) {
  const [confirmInput, setConfirmInput] = useState("");
  const isConfirmed = confirmInput.toUpperCase() === "DELETE";

  // Reset input when dialog closes
  useEffect(() => {
    if (!open) {
      setConfirmInput("");
    }
  }, [open]);

  const handleConfirm = async () => {
    if (!isConfirmed) return;
    await onConfirm();
    if (!loading) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-lg font-semibold font-inter tracking-[-0.5px]">
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-5">
          {/* Warning Box */}
          <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50">
            <p className="text-sm text-red-600 dark:text-red-400 font-inter tracking-[-0.3px] leading-relaxed">
              {description}
            </p>
          </div>

          {/* Confirmation Input */}
          <div className="space-y-2">
            <label className="text-sm text-foreground font-inter tracking-[-0.3px]">
              Type <span className="font-semibold">DELETE</span> to confirm:
            </label>
            <Input
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              placeholder=""
              className="h-11 bg-muted/30 border-border font-inter tracking-[-0.3px] focus-visible:ring-0 focus-visible:ring-offset-0"
              autoComplete="off"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="h-10 px-5 font-inter tracking-[-0.5px] text-muted-foreground hover:text-foreground"
            >
              {cancelText}
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={loading || !isConfirmed}
              className="h-10 px-5 font-inter tracking-[-0.5px] bg-red-600 hover:bg-red-700 text-white border-t border-red-400 rounded-lg disabled:opacity-40"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                confirmText
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
