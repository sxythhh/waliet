import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BulkProgressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  total: number;
  completed: number;
  failed: number;
  isComplete: boolean;
  onClose?: () => void;
  errors?: string[];
}

export function BulkProgressDialog({
  open,
  onOpenChange,
  title,
  total,
  completed,
  failed,
  isComplete,
  onClose,
  errors = [],
}: BulkProgressDialogProps) {
  const progress = total > 0 ? ((completed + failed) / total) * 100 : 0;
  const successful = completed;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {!isComplete && <Loader2 className="h-4 w-4 animate-spin" />}
            {isComplete && failed === 0 && (
              <CheckCircle className="h-4 w-4 text-green-500" />
            )}
            {isComplete && failed > 0 && (
              <XCircle className="h-4 w-4 text-amber-500" />
            )}
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Progress value={progress} className="h-2" />

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {completed + failed} of {total}
            </span>
            <span className="text-muted-foreground">
              {Math.round(progress)}%
            </span>
          </div>

          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>{successful} successful</span>
            </div>
            {failed > 0 && (
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-destructive" />
                <span>{failed} failed</span>
              </div>
            )}
          </div>

          {errors.length > 0 && (
            <div className="mt-4 p-3 bg-destructive/10 rounded-lg max-h-32 overflow-y-auto">
              <p className="text-xs font-medium text-destructive mb-2">Errors:</p>
              <ul className="text-xs text-destructive/80 space-y-1">
                {errors.slice(0, 5).map((error, i) => (
                  <li key={i}>{error}</li>
                ))}
                {errors.length > 5 && (
                  <li>...and {errors.length - 5} more</li>
                )}
              </ul>
            </div>
          )}

          {isComplete && (
            <div className="flex justify-end pt-2">
              <Button onClick={onClose || (() => onOpenChange(false))}>
                Done
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
