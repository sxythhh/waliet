import { useState } from 'react';
import { Circle, CircleCheck } from "lucide-react";

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

  const handleToggle = () => {
    setIsCompleting(true);
    setTimeout(() => {
      onToggle(task);
      setIsCompleting(false);
    }, 300);
  };

  return (
    <div
      className={`flex items-center gap-2 w-full group hover:bg-muted/20 p-2 rounded-md transition-all duration-300 ${
        isCompleting ? 'opacity-50 scale-95' : ''
      }`}
    >
      <button
        onClick={() => onClick(task)}
        className="flex items-center gap-2 flex-1 text-left"
      >
        <div 
          onClick={(e) => { 
            e.stopPropagation(); 
            handleToggle(); 
          }}
          className="flex items-center"
        >
          {isCompleting ? (
            <CircleCheck className="h-4 w-4 text-primary/70 shrink-0 animate-scale-in" />
          ) : (
            <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0 transition-all duration-100 hover:scale-110 hover:text-muted-foreground/60" />
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
