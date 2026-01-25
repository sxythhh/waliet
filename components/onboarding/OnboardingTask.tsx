"use client";

import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { OnboardingTask as Task } from "@/lib/onboarding-steps";

interface OnboardingTaskProps {
  task: Task;
  isCompleted: boolean;
  onToggle: () => void;
}

export function OnboardingTask({
  task,
  isCompleted,
  onToggle,
}: OnboardingTaskProps) {
  return (
    <div className="pt-4">
      <div className="flex items-start gap-4">
        <button
          onClick={onToggle}
          className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
            isCompleted
              ? "bg-primary border-primary"
              : "border-muted-foreground/30 hover:border-primary/50"
          }`}
          aria-label={
            isCompleted ? `Mark "${task.title}" as incomplete` : `Mark "${task.title}" as complete`
          }
        >
          {isCompleted && <Check className="w-4 h-4 text-primary-foreground" />}
        </button>

        <div className="flex-1 min-w-0">
          <h4
            className={`font-bold text-foreground mb-1 ${
              isCompleted ? "line-through opacity-50" : ""
            }`}
          >
            {task.title}
          </h4>
          <p className="text-sm text-muted-foreground mb-3">{task.description}</p>

          {!isCompleted && task.link && (
            <div className="flex gap-3">
              <Button asChild size="sm">
                <a href={task.link} target="_parent">
                  Get started
                </a>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
