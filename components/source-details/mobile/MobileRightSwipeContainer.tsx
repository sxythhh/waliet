import * as React from "react";
import { cn } from "@/lib/utils";

interface MobileRightSwipeContainerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  panel: React.ReactNode;
}

export function MobileRightSwipeContainer({
  isOpen,
  onOpenChange,
  panel,
}: MobileRightSwipeContainerProps) {
  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 bg-black/50 z-40 transition-opacity duration-200",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={() => onOpenChange(false)}
      />

      {/* Sliding drawer from right (full-width panel) */}
      <div
        className={cn(
          "fixed top-0 right-0 h-full z-50 w-full transition-transform duration-200 ease-out",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Panel content - full width */}
        <div className="h-full w-full bg-card overflow-hidden">
          {panel}
        </div>
      </div>
    </>
  );
}
