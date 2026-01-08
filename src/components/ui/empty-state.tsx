import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { LucideIcon } from "lucide-react";

const sizes = {
  sm: {
    container: "py-8",
    iconWrapper: "p-2.5",
    icon: "h-8 w-8",
    title: "text-base",
    description: "text-sm",
  },
  default: {
    container: "py-12",
    iconWrapper: "p-3",
    icon: "h-10 w-10",
    title: "text-lg",
    description: "text-sm",
  },
  lg: {
    container: "py-16",
    iconWrapper: "p-4",
    icon: "h-12 w-12",
    title: "text-xl",
    description: "text-base",
  },
};

export interface EmptyStateAction {
  label: string;
  onClick: () => void;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | "success";
  icon?: LucideIcon;
}

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  className?: string;
  size?: "sm" | "default" | "lg";
  children?: React.ReactNode;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  size = "default",
  children,
}: EmptyStateProps) {
  const s = sizes[size];

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center px-4",
        s.container,
        className
      )}
    >
      {Icon && (
        <div className={cn("mb-4 rounded-full bg-muted", s.iconWrapper)}>
          <Icon className={cn(s.icon, "text-muted-foreground")} />
        </div>
      )}
      <h3 className={cn(s.title, "font-semibold text-foreground mb-2 tracking-tight")}>
        {title}
      </h3>
      {description && (
        <p className={cn(s.description, "text-muted-foreground max-w-sm mb-4")}>
          {description}
        </p>
      )}
      {children}
      {(action || secondaryAction) && (
        <div className="flex items-center gap-3 mt-2">
          {action && (
            <Button
              onClick={action.onClick}
              variant={action.variant || "default"}
              size={size === "sm" ? "sm" : "default"}
            >
              {action.icon && <action.icon className="h-4 w-4" />}
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              onClick={secondaryAction.onClick}
              variant={secondaryAction.variant || "outline"}
              size={size === "sm" ? "sm" : "default"}
            >
              {secondaryAction.icon && <secondaryAction.icon className="h-4 w-4" />}
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

EmptyState.displayName = "EmptyState";
