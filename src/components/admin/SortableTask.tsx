import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Circle, CircleCheck, GripVertical } from "lucide-react";

interface Task {
  id: string;
  title: string;
  status: "todo" | "in_progress" | "done";
}

interface SortableTaskProps {
  task: Task;
  onToggle: (task: Task) => void;
  onClick: (task: Task) => void;
}

export function SortableTask({ task, onToggle, onClick }: SortableTaskProps) {
  const [isCompleting, setIsCompleting] = useState(false);
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

  const handleToggle = () => {
    setIsCompleting(true);
    setTimeout(() => {
      onToggle(task);
      setIsCompleting(false);
    }, 300);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 w-full group hover:bg-muted/20 rounded-md transition-all duration-300 ${
        isCompleting ? 'opacity-50 scale-95' : ''
      }`}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing touch-none p-2 hover:bg-muted/30 rounded-l-md -ml-2"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-5 w-5 text-muted-foreground/50 hover:text-muted-foreground shrink-0" />
      </div>
      <button
        onClick={() => onClick(task)}
        className="flex items-center gap-2 flex-1 text-left p-2 -ml-2"
      >
        <div 
          onClick={(e) => { 
            e.stopPropagation(); 
            handleToggle(); 
          }}
          className="flex items-center"
        >
          {isCompleting ? (
            <CircleCheck className="h-5 w-5 text-primary shrink-0 animate-scale-in" />
          ) : (
            <Circle className="h-5 w-5 text-muted-foreground shrink-0 transition-all duration-100 hover:scale-110" />
          )}
        </div>
        <span className={`text-sm transition-all duration-300 ${
          isCompleting ? 'line-through opacity-50' : ''
        }`}>
          {task.title}
        </span>
      </button>
    </div>
  );
}
