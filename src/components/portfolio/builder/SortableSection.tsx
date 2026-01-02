import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PortfolioSectionType } from "@/types/portfolio";

const SECTION_TITLES: Record<PortfolioSectionType, string> = {
  resume: "Experience & Education",
  skills: "Skills",
  media: "Media Showcase",
  platforms: "Social Platforms",
  creator_info: "Creator Info",
  custom: "Custom Section",
};

interface SortableSectionProps {
  id: PortfolioSectionType;
  onRemove: () => void;
  children: React.ReactNode;
}

export function SortableSection({ id, onRemove, children }: SortableSectionProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "bg-card border border-border rounded-xl overflow-hidden",
        isDragging && "opacity-50 shadow-lg"
      )}
    >
      {/* Section Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border">
        <div className="flex items-center gap-2">
          <button
            className="p-1 rounded hover:bg-muted cursor-grab active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </button>
          <h3 className="font-medium text-sm">{SECTION_TITLES[id]}</h3>
        </div>
        <button
          onClick={onRemove}
          className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Section Content */}
      <div className="p-4">{children}</div>
    </div>
  );
}
