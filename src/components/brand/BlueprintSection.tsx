import { useState, ReactNode } from "react";
import { ChevronDown, ChevronUp, GripVertical } from "lucide-react";
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
    opacity: isDragging ? 0.4 : 1
  };
  const getStatusBadge = () => {
    if (!status) return null;
    if (status === "filled") {
      return <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/20 text-emerald-500 font-inter tracking-[-0.5px]">
          Filled
        </span>;
    }
    if (status === "selected" || statusCount) {
      return <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/20 text-emerald-500 font-inter tracking-[-0.5px]">
          {statusCount ? `${statusCount} Selected` : "Selected"}
        </span>;
    }
    return null;
  };
  return <div ref={setNodeRef} style={style} className={cn("group relative rounded-xl border border-border/50 bg-card/30 transition-all hover:border-border/80", isDragging && "opacity-50 z-50 shadow-xl")}>
      {/* Drag Handle - hidden on mobile */}
      {!isMobile && <div {...attributes} {...listeners} className="absolute left-0 top-0 bottom-0 w-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing">
          <GripVertical className="h-4 w-4 text-muted-foreground/50" />
        </div>}

      {/* Header */}
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center gap-3 px-4 py-3 pl-8 text-left">
        {icon && <span className="text-muted-foreground hidden">{icon}</span>}
        <span className="flex-1 text-sm font-medium font-inter tracking-[-0.5px] text-foreground">
          {title}
        </span>
        {getStatusBadge()}
        {onRemove}
        {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {/* Content */}
      <div className={cn("overflow-hidden transition-all duration-200", isOpen ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0")}>
        <div className="px-4 pb-4 pl-8">{children}</div>
      </div>
    </div>;
}