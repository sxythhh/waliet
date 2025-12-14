import { useState, ReactNode } from "react";
import { ChevronDown, ChevronUp, GripVertical, Trash2 } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { cn } from "@/lib/utils";

interface BlueprintSectionProps {
  id: string;
  title: string;
  icon: ReactNode;
  status?: "filled" | "unfilled" | "selected" | string;
  statusCount?: number;
  children: ReactNode;
  onRemove?: () => void;
  defaultOpen?: boolean;
}

export function BlueprintSection({
  id,
  title,
  icon,
  status,
  statusCount,
  children,
  onRemove,
  defaultOpen = true,
}: BlueprintSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const getStatusBadge = () => {
    if (!status) return null;
    
    if (status === "filled") {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/20 text-emerald-500 font-inter tracking-[-0.5px]">
          Filled
        </span>
      );
    }
    if (status === "unfilled") {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground font-inter tracking-[-0.5px]">
          Unfilled
        </span>
      );
    }
    if (status === "selected" || statusCount) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/20 text-emerald-500 font-inter tracking-[-0.5px]">
          {statusCount ? `${statusCount} Selected` : "Selected"}
        </span>
      );
    }
    return null;
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative rounded-xl border border-border/50 bg-card/30 transition-all hover:border-border/80",
        isDragging && "opacity-50 z-50 shadow-xl"
      )}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute left-0 top-0 bottom-0 w-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground/50" />
      </div>

      {/* Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 px-4 py-3 pl-8 text-left"
      >
        <span className="text-muted-foreground">{icon}</span>
        <span className="flex-1 text-sm font-medium font-inter tracking-[-0.5px] text-foreground">
          {title}
        </span>
        {getStatusBadge()}
        {onRemove && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="h-6 w-6 flex items-center justify-center rounded-md opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {/* Content */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-200",
          isOpen ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="px-4 pb-4 pl-8">{children}</div>
      </div>
    </div>
  );
}