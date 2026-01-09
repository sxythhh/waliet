import { Button } from "@/components/ui/button";
import { X, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BulkAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost";
  onClick: () => void;
  disabled?: boolean;
}

interface BulkActionBarProps {
  selectedCount: number;
  actions: BulkAction[];
  onClearSelection: () => void;
  loading?: boolean;
  className?: string;
}

export function BulkActionBar({
  selectedCount,
  actions,
  onClearSelection,
  loading = false,
  className,
}: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div
      className={cn(
        "fixed bottom-6 left-1/2 -translate-x-1/2 z-50",
        "bg-foreground text-background rounded-xl shadow-2xl",
        "px-4 py-3 flex items-center gap-4",
        "animate-in slide-in-from-bottom-4 fade-in-0 duration-200",
        className
      )}
    >
      {/* Selection count */}
      <div className="flex items-center gap-2 pr-4 border-r border-background/20">
        <span className="text-sm font-medium">
          {selectedCount} selected
        </span>
        <button
          onClick={onClearSelection}
          className="p-1 hover:bg-background/10 rounded"
          disabled={loading}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {loading && (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        )}
        {actions.map((action) => (
          <Button
            key={action.id}
            variant={action.variant || "secondary"}
            size="sm"
            onClick={action.onClick}
            disabled={action.disabled || loading}
            className={cn(
              "h-8 px-3 text-sm",
              action.variant === "destructive"
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : "bg-background/10 text-background hover:bg-background/20 border-0"
            )}
          >
            {action.icon && <span className="mr-1.5">{action.icon}</span>}
            {action.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
