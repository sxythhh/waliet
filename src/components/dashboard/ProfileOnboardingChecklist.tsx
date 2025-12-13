import { useState } from "react";
import { Check, ChevronUp, ChevronDown, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface OnboardingTask {
  id: string;
  label: string;
  completed: boolean;
  onClick?: () => void;
}

interface ProfileOnboardingChecklistProps {
  tasks: OnboardingTask[];
  onTaskClick?: (taskId: string) => void;
}

export function ProfileOnboardingChecklist({ tasks, onTaskClick }: ProfileOnboardingChecklistProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  
  const completedCount = tasks.filter(t => t.completed).length;
  const totalCount = tasks.length;
  
  // Split tasks into two columns
  const midpoint = Math.ceil(tasks.length / 2);
  const leftColumnTasks = tasks.slice(0, midpoint);
  const rightColumnTasks = tasks.slice(midpoint);

  const TaskRow = ({ task }: { task: OnboardingTask }) => (
    <button
      onClick={() => {
        task.onClick?.();
        onTaskClick?.(task.id);
      }}
      className={cn(
        "flex items-center justify-between gap-3 w-full text-left py-2.5 px-1 rounded-lg transition-colors group",
        "hover:bg-muted/30"
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-colors",
          task.completed 
            ? "bg-green-500" 
            : "border-2 border-muted-foreground/30"
        )}>
          {task.completed && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
        </div>
        <span 
          className={cn(
            "text-sm transition-colors",
            task.completed 
              ? "text-foreground" 
              : "text-muted-foreground"
          )}
          style={{ fontFamily: 'Inter', letterSpacing: '-0.3px' }}
        >
          {task.label}
        </span>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );

  const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const radius = 18;
  const strokeWidth = 3;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercentage / 100) * circumference;

  return (
    <Card className="bg-card border border-border overflow-hidden">
      <CardContent className="p-0">
        {/* Header */}
        <div 
          className="flex items-center justify-between p-4 cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-3">
            {/* Circular Progress Bar */}
            <div className="relative w-10 h-10">
              <svg className="w-10 h-10 -rotate-90" viewBox="0 0 44 44">
                {/* Background circle */}
                <circle
                  cx="22"
                  cy="22"
                  r={radius}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={strokeWidth}
                  className="text-muted"
                />
                {/* Progress circle */}
                <circle
                  cx="22"
                  cy="22"
                  r={radius}
                  fill="none"
                  stroke="#2060df"
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-500 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-semibold text-foreground" style={{ fontFamily: 'Inter', letterSpacing: '-0.3px' }}>
                  {completedCount}/{totalCount}
                </span>
              </div>
            </div>
            <Badge 
              variant="secondary" 
              className="bg-muted text-foreground border-0 font-medium"
              style={{ fontFamily: 'Inter', letterSpacing: '-0.3px' }}
            >
              {completedCount} of {totalCount} tasks completed
            </Badge>
          </div>
          <button className="text-muted-foreground hover:text-foreground transition-colors">
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>

        {/* Expandable Content */}
        {isExpanded && (
          <div className="px-4 pb-4">
            {/* Title and Description */}
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-foreground" style={{ fontFamily: 'Inter', letterSpacing: '-0.5px' }}>
                Get discovered
              </h3>
              <p className="text-sm text-muted-foreground mt-0.5" style={{ fontFamily: 'Inter', letterSpacing: '-0.3px' }}>
                Finish these steps to show up in campaigns and get invited to more programs.
              </p>
            </div>

            {/* Tasks Grid */}
            <div className="bg-muted/20 rounded-xl p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
                {/* Left Column */}
                <div className="space-y-1">
                  {leftColumnTasks.map(task => (
                    <TaskRow key={task.id} task={task} />
                  ))}
                </div>
                
                {/* Right Column */}
                <div className="space-y-1">
                  {rightColumnTasks.map(task => (
                    <TaskRow key={task.id} task={task} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
