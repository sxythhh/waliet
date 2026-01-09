import { useState, useRef, useEffect } from "react";
import { ChevronDown, GripVertical, Pencil, Trash2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ExpandableCardProps {
  id: string;
  preview: React.ReactNode;
  children: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
  onSave?: () => void;
  onDelete?: () => void;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
  className?: string;
  showDragHandle?: boolean;
}

export function ExpandableCard({
  id,
  preview,
  children,
  isExpanded,
  onToggle,
  onSave,
  onDelete,
  dragHandleProps,
  className,
  showDragHandle = true,
}: ExpandableCardProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(isExpanded ? contentRef.current.scrollHeight : 0);
    }
  }, [isExpanded, children]);

  return (
    <div
      className={cn(
        "group relative rounded-xl border border-border/60 bg-white dark:bg-card/80 transition-all duration-200",
        isExpanded && "ring-2 ring-primary/20 border-primary/30 shadow-md",
        !isExpanded && "hover:border-border hover:shadow-sm",
        className
      )}
    >
      {/* Preview / Header */}
      <div
        className={cn(
          "flex items-start gap-3 p-4 cursor-pointer select-none",
          isExpanded && "border-b border-border/50"
        )}
        onClick={() => !isExpanded && onToggle()}
      >
        {/* Drag Handle */}
        {showDragHandle && (
          <button
            className={cn(
              "mt-0.5 p-1 rounded-md transition-all opacity-0 group-hover:opacity-100",
              "hover:bg-muted cursor-grab active:cursor-grabbing",
              isExpanded && "opacity-100"
            )}
            {...dragHandleProps}
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground/60" />
          </button>
        )}

        {/* Preview Content */}
        <div className="flex-1 min-w-0">{preview}</div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {!isExpanded && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggle();
                }}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors opacity-0 group-hover:opacity-100"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              {onDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </>
          )}
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform duration-200",
              isExpanded && "rotate-180"
            )}
          />
        </div>
      </div>

      {/* Expandable Content */}
      <div
        style={{ height: contentHeight }}
        className="overflow-hidden transition-all duration-200 ease-out"
      >
        <div ref={contentRef} className="p-4 pt-3 space-y-4">
          {children}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onToggle}
              className="text-muted-foreground"
            >
              <X className="h-4 w-4 mr-1.5" />
              Cancel
            </Button>
            {onSave && (
              <Button type="button" size="sm" onClick={onSave}>
                <Check className="h-4 w-4 mr-1.5" />
                Save
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Add Card Button Component
interface AddCardButtonProps {
  onClick: () => void;
  label: string;
  icon?: React.ReactNode;
  className?: string;
}

export function AddCardButton({ onClick, label, icon, className }: AddCardButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full p-4 rounded-xl border-2 border-dashed border-border/60",
        "flex items-center justify-center gap-2",
        "text-sm text-muted-foreground font-medium",
        "hover:border-primary/40 hover:text-foreground hover:bg-muted/30",
        "transition-all duration-200",
        className
      )}
    >
      {icon}
      {label}
    </button>
  );
}
