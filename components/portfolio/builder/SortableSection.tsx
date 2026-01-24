import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PortfolioSectionType } from "@/types/portfolio";

const SECTION_CONFIG: Record<PortfolioSectionType, { title: string }> = {
  resume: { title: "Experience & Education" },
  skills: { title: "Skills" },
  media: { title: "Media Showcase" },
  platforms: { title: "Social Platforms" },
  creator_info: { title: "Creator Info" },
  custom: { title: "Custom Section" },
};

interface SortableSectionProps {
  id: PortfolioSectionType;
  onRemove: () => void;
  children: React.ReactNode;
  itemCount?: number;
}

export function SortableSection({ id, onRemove, children, itemCount }: SortableSectionProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  // Only apply Y-axis translation to prevent stretching
  const style = {
    transform: transform ? `translate3d(0, ${transform.y}px, 0)` : undefined,
    transition,
    zIndex: isDragging ? 10 : undefined,
  };

  const config = SECTION_CONFIG[id];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group rounded-2xl border border-border/50 bg-white dark:bg-card/60 shadow-sm overflow-hidden transition-all duration-200",
        isDragging && "opacity-80 shadow-xl",
        !isDragging && "hover:shadow-md hover:border-border/80"
      )}
    >
      {/* Section Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/40 bg-muted/20">
        <div className="flex items-center gap-3">
          <button
            className={cn(
              "p-1.5 rounded-lg cursor-grab active:cursor-grabbing transition-all",
              "opacity-40 group-hover:opacity-100 hover:bg-muted"
            )}
            {...attributes}
            {...listeners}
          >
            <div className="flex flex-col gap-0.5">
              <div className="flex gap-0.5">
                <div className="w-1 h-1 rounded-full bg-foreground/50" />
                <div className="w-1 h-1 rounded-full bg-foreground/50" />
              </div>
              <div className="flex gap-0.5">
                <div className="w-1 h-1 rounded-full bg-foreground/50" />
                <div className="w-1 h-1 rounded-full bg-foreground/50" />
              </div>
              <div className="flex gap-0.5">
                <div className="w-1 h-1 rounded-full bg-foreground/50" />
                <div className="w-1 h-1 rounded-full bg-foreground/50" />
              </div>
            </div>
          </button>
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-sm tracking-[-0.5px]">
              {config.title}
            </h3>
            {itemCount !== undefined && itemCount > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-muted text-muted-foreground">
                {itemCount}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={onRemove}
          className={cn(
            "p-1.5 rounded-lg transition-all",
            "text-muted-foreground hover:text-destructive hover:bg-destructive/10",
            "opacity-0 group-hover:opacity-100"
          )}
          title="Remove section"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Section Content */}
      <div className="p-5">{children}</div>
    </div>
  );
}
