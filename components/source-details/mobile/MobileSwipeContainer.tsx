import * as React from "react";
import { cn } from "@/lib/utils";

interface MobileSwipeContainerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  panel: React.ReactNode;
  children: React.ReactNode;
}

export function MobileSwipeContainer({
  isOpen,
  onOpenChange,
  panel,
  children,
}: MobileSwipeContainerProps) {
  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* Main content */}
      <div className="h-full w-full">
        {children}
      </div>

      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 bg-black/50 z-40 transition-opacity duration-200",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={() => onOpenChange(false)}
      />

      {/* Sliding drawer (full-width panel) */}
      <div
        className={cn(
          "fixed top-0 left-0 h-full z-50 w-full transition-transform duration-200 ease-out",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Navigation Panel - full width */}
        <div className="h-full w-full bg-card overflow-hidden">
          {panel}
        </div>
      </div>
    </div>
  );
}
