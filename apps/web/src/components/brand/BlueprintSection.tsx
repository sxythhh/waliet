import { useState, ReactNode } from "react";
import { ChevronDown, GripVertical } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

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
  defaultOpen = true
}: BlueprintSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const isMobile = useIsMobile();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id,
    disabled: isMobile
  });

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
    opacity: isDragging ? 0.5 : 1
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative rounded-2xl border border-border/40 bg-card transition-all duration-200",
        "hover:border-border/60 hover:shadow-sm",
        isDragging && "opacity-50 z-50 shadow-2xl scale-[1.02]"
      )}
    >
      {/* Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left group/header"
      >
        {/* Title */}
        <span className="text-sm font-medium font-inter tracking-[-0.3px] text-foreground">
          {title}
        </span>

        {/* Drag Handle - hidden on mobile */}
        {!isMobile && (
          <div
            {...attributes}
            {...listeners}
            className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing ml-1"
            onClick={e => e.stopPropagation()}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground/40 hover:text-muted-foreground" />
          </div>
        )}

        <div className="flex-1" />

        {/* Chevron */}
        <div className={cn(
          "flex items-center justify-center h-6 w-6 rounded-md transition-all",
          "hover:bg-muted/50"
        )}>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform duration-200",
              isOpen && "rotate-180"
            )}
          />
        </div>
      </button>

      {/* Content */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-300 ease-out",
          isOpen ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="px-4 pb-4 pt-0">{children}</div>
      </div>
    </div>
  );
}
