import * as React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { Skeleton } from "./skeleton";

const spinnerSizes = {
  xs: "h-3 w-3",
  sm: "h-4 w-4",
  default: "h-6 w-6",
  lg: "h-8 w-8",
  xl: "h-12 w-12",
};

export interface SpinnerProps {
  className?: string;
  size?: keyof typeof spinnerSizes;
}

/**
 * Animated spinner using Loader2 icon
 */
export function Spinner({ className, size = "default" }: SpinnerProps) {
  return (
    <Loader2
      className={cn(
        "animate-spin text-muted-foreground",
        spinnerSizes[size],
        className
      )}
    />
  );
}

Spinner.displayName = "Spinner";

/**
 * Animated loading bar (horizontal progress indicator)
 */
export function LoadingBar({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "h-1 w-full overflow-hidden rounded-full bg-muted",
        className
      )}
    >
      <div className="h-full w-1/3 animate-loading-bar rounded-full bg-primary" />
    </div>
  );
}

LoadingBar.displayName = "LoadingBar";

// Re-export Skeleton from skeleton.tsx for convenience
export { Skeleton };

export interface PageLoaderProps {
  message?: string;
  className?: string;
}

/**
 * Full page loading state with centered spinner
 */
export function PageLoader({
  message = "Loading...",
  className,
}: PageLoaderProps) {
  return (
    <div
      className={cn(
        "flex min-h-screen w-full items-center justify-center bg-background",
        className
      )}
    >
      <div className="flex flex-col items-center gap-4">
        <Spinner size="lg" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

PageLoader.displayName = "PageLoader";

export interface InlineLoaderProps {
  message?: string;
  className?: string;
  size?: keyof typeof spinnerSizes;
}

/**
 * Inline loading state for use within content
 */
export function InlineLoader({
  message,
  className,
  size = "sm",
}: InlineLoaderProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Spinner size={size} />
      {message && (
        <span className="text-sm text-muted-foreground">{message}</span>
      )}
    </div>
  );
}

InlineLoader.displayName = "InlineLoader";

export interface CardLoaderProps {
  className?: string;
  rows?: number;
}

/**
 * Skeleton loader for card content
 */
export function CardLoader({ className, rows = 3 }: CardLoaderProps) {
  return (
    <div className={cn("space-y-3 p-4", className)}>
      {Array.from({ length: Math.max(1, rows) }).map((_, i) => (
        <Skeleton key={i} className={cn("h-4", i === 0 ? "w-3/4" : "w-full")} />
      ))}
    </div>
  );
}

CardLoader.displayName = "CardLoader";

export interface TableLoaderProps {
  className?: string;
  rows?: number;
  columns?: number;
}

/**
 * Skeleton loader for table content
 */
export function TableLoader({
  className,
  rows = 5,
  columns = 4,
}: TableLoaderProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {/* Header */}
      <div className="flex gap-4 pb-2 border-b border-border">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4 py-3">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

TableLoader.displayName = "TableLoader";
