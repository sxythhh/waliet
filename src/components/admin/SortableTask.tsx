import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Circle, GripVertical } from "lucide-react";

interface Task {
  id: string;
  title: string;
  status: "todo" | "in_progress" | "done";
}

interface SortableTaskProps {
  task: Task;
  onToggle: (task: Task) => void;
}

export function SortableTask({ task, onToggle }: SortableTaskProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-2 w-full group hover:bg-muted/20 p-2 rounded-md transition-colors"
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing touch-none"
      >
        <GripVertical className="h-5 w-5 text-muted-foreground/50 hover:text-muted-foreground shrink-0 mt-0.5" />
      </div>
      <button
        onClick={() => onToggle(task)}
        className="flex items-start gap-2 flex-1 text-left"
      >
        <Circle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5 transition-all duration-100 hover:scale-110" />
        <span className="text-sm">{task.title}</span>
      </button>
    </div>
  );
}
